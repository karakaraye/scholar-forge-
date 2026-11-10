from django.core.management.base import BaseCommand
from django.utils.text import slugify
from disciplines.models import AcademicDiscipline

DISCIPLINES_DATA = [
    {"name": "Computer Science", "category": "STEM", "description": "Algorithms, computation, artificial intelligence, software systems, and data structures."},
    {"name": "Information Technology", "category": "STEM", "description": "Information systems, networking, cloud infrastructure, cybersecurity, and applied computing."},
    {"name": "Management", "category": "Business & Management", "description": "Organizational leadership, strategic management, operations, and human resources."},
    {"name": "Business Administration", "category": "Business & Management", "description": "Enterprise administration, corporate strategy, international business, and entrepreneurship."},
    {"name": "Accounting", "category": "Business & Management", "description": "Financial reporting, auditing, taxation, managerial accounting, and forensic analysis."},
    {"name": "Economics", "category": "Social Sciences", "description": "Microeconomics, macroeconomics, econometrics, developmental economics, and public policy."},
    {"name": "Finance", "category": "Business & Management", "description": "Corporate finance, asset pricing, banking, investments, and risk management."},
    {"name": "Engineering", "category": "STEM", "description": "Civil, mechanical, electrical, chemical, biomedical, and aerospace engineering systems."},
    {"name": "Medicine", "category": "Health & Medical Sciences", "description": "Clinical medicine, medical research, therapeutics, pathology, and healthcare interventions."},
    {"name": "Nursing", "category": "Health & Medical Sciences", "description": "Clinical nursing practice, patient care, healthcare administration, and nursing education."},
    {"name": "Public Health", "category": "Health & Medical Sciences", "description": "Epidemiology, biostatistics, global health, health policy, and environmental health."},
    {"name": "Education", "category": "Social Sciences & Education", "description": "Pedagogy, curriculum design, educational technology, leadership, and learning psychology."},
    {"name": "Law", "category": "Law & Legal Studies", "description": "Constitutional law, commercial law, international law, jurisprudence, and human rights."},
    {"name": "Political Science", "category": "Social Sciences", "description": "Political theory, comparative politics, international relations, and public governance."},
    {"name": "Sociology", "category": "Social Sciences", "description": "Social structures, social inequality, cultural studies, urban sociology, and demography."},
    {"name": "Psychology", "category": "Social Sciences", "description": "Cognitive psychology, clinical psychology, behavioral neuroscience, and social psychology."},
    {"name": "Agriculture", "category": "Agricultural & Environmental Sciences", "description": "Agronomy, agricultural economics, soil science, crop production, and livestock systems."},
    {"name": "Environmental Science", "category": "Agricultural & Environmental Sciences", "description": "Ecology, conservation, climate change, environmental impact assessment, and sustainability."},
    {"name": "Arts", "category": "Arts & Humanities", "description": "Visual arts, performing arts, design, art history, and creative practices."},
    {"name": "Humanities", "category": "Arts & Humanities", "description": "Philosophy, history, literature, linguistics, cultural studies, and religious studies."},
    {"name": "Other", "category": "General & Multidisciplinary", "description": "Interdisciplinary and cross-domain academic research topics."},
]


class Command(BaseCommand):
    help = 'Seeds initial 21 academic disciplines into ScholarForge AI'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for item in DISCIPLINES_DATA:
            slug = slugify(item['name'])
            obj, created = AcademicDiscipline.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': item['name'],
                    'category': item['category'],
                    'description': item['description'],
                    'is_active': True
                }
            )
            if created:
                created_count += 1
            else:
                obj.name = item['name']
                obj.category = item['category']
                obj.description = item['description']
                obj.is_active = True
                obj.save()
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded disciplines: {created_count} created, {updated_count} updated."
        ))

