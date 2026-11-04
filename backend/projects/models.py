import uuid
from django.db import models
from django.conf import settings
from accounts.models import AcademicLevel


class DocumentCategory(models.TextChoices):
    ACADEMIC_PROJECT = 'ACADEMIC_PROJECT', 'Academic Project'
    RESEARCH_PAPER = 'RESEARCH_PAPER', 'Research Paper'
    JOURNAL_ARTICLE = 'JOURNAL_ARTICLE', 'Journal Article'


class CitationStyle(models.TextChoices):
    APA = 'APA', 'APA 7th edition'
    MLA = 'MLA', 'MLA 9th edition'
    CHICAGO = 'CHICAGO', 'Chicago 17th edition'
    HARVARD = 'HARVARD', 'Harvard'
    IEEE = 'IEEE', 'IEEE'
    VANCOUVER = 'VANCOUVER', 'Vancouver'


class ProjectStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    ACTIVE = 'ACTIVE', 'Active'
    ARCHIVED = 'ARCHIVED', 'Archived'


class ResearchProject(models.Model):
    """
    Core Research Project model configured for multidisciplinary research.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.CASCADE,
        related_name='projects'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='research_projects'
    )
    discipline = models.ForeignKey(
        'disciplines.AcademicDiscipline',
        on_delete=models.PROTECT,
        related_name='projects'
    )
    title = models.CharField(max_length=500)
    document_category = models.CharField(
        max_length=50,
        choices=DocumentCategory.choices,
        default=DocumentCategory.ACADEMIC_PROJECT
    )
    document_subtype = models.CharField(max_length=150)
    academic_level = models.CharField(
        max_length=50,
        choices=AcademicLevel.choices,
        default=AcademicLevel.UNDERGRADUATE
    )
    status = models.CharField(
        max_length=50,
        choices=ProjectStatus.choices,
        default=ProjectStatus.ACTIVE,
        db_index=True
    )
    institution = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=100, default='United States')
    preferred_language = models.CharField(max_length=50, default='English')
    citation_style = models.CharField(
        max_length=50,
        choices=CitationStyle.choices,
        default=CitationStyle.APA
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Project'
        verbose_name_plural = 'Research Projects'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.get_document_category_display()})"


class ResearchRequirements(models.Model):
    """
    Specific requirements, supervisor instructions, and guidelines for a research project.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        ResearchProject,
        on_delete=models.CASCADE,
        related_name='requirements'
    )
    research_methodology = models.TextField(blank=True)
    research_objectives = models.TextField(blank=True)
    supervisor_requirements = models.TextField(blank=True)
    target_word_count = models.PositiveIntegerField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    custom_parameters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Requirements'
        verbose_name_plural = 'Research Requirements'

    def __str__(self):
        return f"Requirements for {self.project.title}"
