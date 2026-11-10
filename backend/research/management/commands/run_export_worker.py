"""
Background worker that renders queued DOCX/PDF export jobs.

Run one or more of these alongside the web process when EXPORT_JOB_MODE=worker:

    python manage.py run_export_worker              # poll forever
    python manage.py run_export_worker --once       # drain the queue once and exit (cron-friendly)

Several workers can run at once: each job is claimed atomically, so it is rendered exactly once.
"""

import logging
import signal
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from research.export_job_service import ExportJobService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Renders queued document export jobs (used when EXPORT_JOB_MODE=worker)."

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Process the current queue once, then exit.')
        parser.add_argument('--interval', type=float, default=2.0, help='Seconds to sleep when the queue is empty.')
        parser.add_argument('--batch', type=int, default=5, help='Maximum jobs to claim per poll.')

    def handle(self, *args, **options):
        self._stop = False

        def request_stop(signum, _frame):
            logger.info("Export worker received signal %s; finishing current job then exiting.", signum)
            self._stop = True

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                signal.signal(sig, request_stop)
            except (ValueError, OSError):  # not in main thread / unsupported on this platform
                pass

        self.stdout.write(self.style.SUCCESS('Export worker started.'))
        total = 0
        while not self._stop:
            close_old_connections()
            try:
                stale = ExportJobService.fail_stale_jobs()
                if stale:
                    logger.warning("Marked %s stale export job(s) as failed.", stale)
                processed = ExportJobService.run_pending_jobs(limit=options['batch'])
            except Exception:  # noqa: BLE001 - keep the worker alive across transient DB errors
                logger.exception("Export worker poll failed")
                processed = 0

            total += processed
            if options['once']:
                if processed == 0:
                    self.stdout.write(f'Processed {total} export job(s).')
                    break
                continue
            if processed == 0:
                time.sleep(options['interval'])

        self.stdout.write('Export worker stopped.')
