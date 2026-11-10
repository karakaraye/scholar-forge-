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

    @property
    def problem_statement(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            return req.custom_parameters.get('problem_statement', '')
        return ''

    @problem_statement.setter
    def problem_statement(self, val):
        req = getattr(self, 'requirements', None)
        if req:
            if not isinstance(req.custom_parameters, dict):
                req.custom_parameters = {}
            req.custom_parameters['problem_statement'] = val
            req.save(update_fields=['custom_parameters'])

    @property
    def research_aim(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            return req.custom_parameters.get('research_aim', '')
        return ''

    @research_aim.setter
    def research_aim(self, val):
        req = getattr(self, 'requirements', None)
        if req:
            if not isinstance(req.custom_parameters, dict):
                req.custom_parameters = {}
            req.custom_parameters['research_aim'] = val
            req.save(update_fields=['custom_parameters'])

    @property
    def objectives(self):
        req = getattr(self, 'requirements', None)
        if req and req.research_objectives:
            return [line.strip() for line in req.research_objectives.splitlines() if line.strip()]
        return []

    @objectives.setter
    def objectives(self, val):
        req = getattr(self, 'requirements', None)
        if req:
            if isinstance(val, list):
                req.research_objectives = "\n".join(val)
            else:
                req.research_objectives = str(val)
            req.save(update_fields=['research_objectives'])

    @property
    def research_questions(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            raw = req.custom_parameters.get('research_questions', '')
            if isinstance(raw, list):
                return raw
            elif isinstance(raw, str):
                return [line.strip() for line in raw.splitlines() if line.strip()]
        return []

    @research_questions.setter
    def research_questions(self, val):
        req = getattr(self, 'requirements', None)
        if req:
            if not isinstance(req.custom_parameters, dict):
                req.custom_parameters = {}
            req.custom_parameters['research_questions'] = val
            req.save(update_fields=['custom_parameters'])

    @property
    def hypotheses(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            raw = req.custom_parameters.get('research_hypotheses', '')
            if isinstance(raw, list):
                return raw
            elif isinstance(raw, str):
                return [line.strip() for line in raw.splitlines() if line.strip()]
        return []

    @hypotheses.setter

    @property
    def keywords(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            return req.custom_parameters.get('keywords', '')
        return ''

    @keywords.setter
    def keywords(self, val):
        req = getattr(self, 'requirements', None)
        if req:
            params = dict(req.custom_parameters or {})
            params['keywords'] = val
            req.custom_parameters = params
            req.save()

    def hypotheses(self, val):
        req = getattr(self, 'requirements', None)
        if req:
            if not isinstance(req.custom_parameters, dict):
                req.custom_parameters = {}
            req.custom_parameters['research_hypotheses'] = val
            req.save(update_fields=['custom_parameters'])

    @property
    def scope_and_delimitations(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            return req.custom_parameters.get('scope_and_delimitations', '')
        return ''

    @property
    def limitations(self):
        req = getattr(self, 'requirements', None)
        if req and isinstance(req.custom_parameters, dict):
            return req.custom_parameters.get('limitations', '')
        return ''

    @property
    def methodology_summary(self):
        req = getattr(self, 'requirements', None)
        if req:
            return req.research_methodology or ''
        return ''

    @property
    def target_word_count(self):
        req = getattr(self, 'requirements', None)
        if req and req.target_word_count:
            return req.target_word_count
        return 10000


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
