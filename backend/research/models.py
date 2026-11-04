import uuid
from django.db import models
from django.conf import settings


class SourceType(models.TextChoices):
    JOURNAL = 'JOURNAL', 'Journal Article'
    BOOK = 'BOOK', 'Book'
    CONFERENCE = 'CONFERENCE', 'Conference Paper'
    THESIS = 'THESIS', 'Thesis / Dissertation'
    REPORT = 'REPORT', 'Institutional Report'
    WEBSITE = 'WEBSITE', 'Website / Web Document'
    OTHER = 'OTHER', 'Other Academic Source'


class ResearchSource(models.Model):
    """
    Global academic source cataloged in ScholarForge.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    authors = models.JSONField(default=list, help_text='List of author names')
    publication_year = models.PositiveIntegerField(null=True, blank=True)
    source_type = models.CharField(
        max_length=50,
        choices=SourceType.choices,
        default=SourceType.JOURNAL
    )
    journal_or_publisher = models.CharField(max_length=255, blank=True)
    doi = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=1000, blank=True)
    abstract = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Source'
        verbose_name_plural = 'Research Sources'
        ordering = ['-created_at']

    def __str__(self):
        year_str = f" ({self.publication_year})" if self.publication_year else ""
        return f"{self.title}{year_str}"


class ProjectSource(models.Model):
    """
    Association between a research project and a research source with annotations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='project_sources'
    )
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.CASCADE,
        related_name='project_associations'
    )
    notes = models.TextField(blank=True)
    relevance_score = models.PositiveIntegerField(
        default=5,
        help_text='User relevance rating from 1 to 10'
    )
    is_annotated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Project Source'
        verbose_name_plural = 'Project Sources'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'source'],
                name='unique_project_source_link'
            )
        ]

    def __str__(self):
        return f"{self.source.title} in {self.project.title}"


class Citation(models.Model):
    """
    Formatted academic citation tied to a project and source.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='citations'
    )
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.CASCADE,
        related_name='citations'
    )
    citation_style = models.CharField(max_length=50)
    in_text_format = models.CharField(max_length=500)
    full_reference = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Citation'
        verbose_name_plural = 'Citations'
        ordering = ['source__title']

    def __str__(self):
        return f"[{self.citation_style}] {self.in_text_format}"


class AIJobStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'


class AIJob(models.Model):
    """
    Foundational model for asynchronous AI research jobs.
    Prepared for Stage 2 background AI processing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='ai_jobs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_jobs'
    )
    job_type = models.CharField(max_length=100)
    status = models.CharField(
        max_length=50,
        choices=AIJobStatus.choices,
        default=AIJobStatus.PENDING
    )
    input_payload = models.JSONField(default=dict)
    output_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'AI Job'
        verbose_name_plural = 'AI Jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_type} ({self.status}) for {self.project.title}"
