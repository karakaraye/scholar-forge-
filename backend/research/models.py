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


class VerificationStatus(models.TextChoices):
    METADATA_VERIFIED = 'METADATA_VERIFIED', 'Metadata Verified'
    PARTIALLY_VERIFIED = 'PARTIALLY_VERIFIED', 'Partially Verified'
    UNVERIFIED = 'UNVERIFIED', 'Unverified'
    METADATA_CONFLICT = 'METADATA_CONFLICT', 'Metadata Conflict'
    WITHDRAWN_OR_RETRACTED = 'WITHDRAWN_OR_RETRACTED', 'Withdrawn / Retracted'


class ResearchSource(models.Model):
    """
    Global academic source cataloged in ScholarForge.
    Extended in Stage 3 with authoritative verification status, open access indicator,
    citation counts, provenance, and BibTeX representation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_sources'
    )
    title = models.CharField(max_length=500)
    authors = models.JSONField(default=list, help_text='List of author names')
    publication_year = models.PositiveIntegerField(null=True, blank=True)
    source_type = models.CharField(
        max_length=50,
        choices=SourceType.choices,
        default=SourceType.JOURNAL
    )
    journal_or_publisher = models.CharField(max_length=255, blank=True)
    doi = models.CharField(max_length=255, blank=True, db_index=True)
    url = models.URLField(max_length=1000, blank=True)
    abstract = models.TextField(blank=True)
    
    # Stage 3 Additions
    verification_status = models.CharField(
        max_length=50,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED
    )
    is_open_access = models.BooleanField(default=False)
    citation_count = models.PositiveIntegerField(default=0)
    provenance = models.JSONField(
        default=list,
        blank=True,
        help_text='List of providers that verified or cataloged this source (e.g. OpenAlex, Crossref)'
    )
    retracted = models.BooleanField(default=False)
    retraction_details = models.TextField(blank=True)
    external_id = models.CharField(max_length=255, blank=True, db_index=True)
    bibtex = models.TextField(blank=True)
    keywords = models.JSONField(default=list, blank=True)
    
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
    tags = models.JSONField(default=list, blank=True)
    is_favorite = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
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
    in_text_format = models.CharField(max_length=500, help_text='e.g. (Vaswani et al., 2017) or [1]')
    in_text_narrative = models.CharField(max_length=500, blank=True, help_text='e.g. Vaswani et al. (2017)')
    citation_number = models.PositiveIntegerField(null=True, blank=True, help_text='Numeric citation index for IEEE/Vancouver')
    page_reference = models.CharField(max_length=50, blank=True)
    full_reference = models.TextField(help_text='Full bibliography reference entry')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Citation'
        verbose_name_plural = 'Citations'
        ordering = ['source__title']

    def __str__(self):
        return f"[{self.citation_style}] {self.in_text_format}"


class ResearchCollection(models.Model):
    """
    User or workspace organizational folders for organizing research literature.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='research_collections'
    )
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collections'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=50, default='#1E3A8A')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Collection'
        verbose_name_plural = 'Research Collections'
        ordering = ['name']

    def __str__(self):
        return self.name


class ResearchCollectionItem(models.Model):
    """
    Item membership within a ResearchCollection with notes, tags, and reading status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    collection = models.ForeignKey(
        ResearchCollection,
        on_delete=models.CASCADE,
        related_name='items'
    )
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.CASCADE,
        related_name='collection_memberships'
    )
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_favorite = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Research Collection Item'
        verbose_name_plural = 'Research Collection Items'
        ordering = ['-added_at']
        constraints = [
            models.UniqueConstraint(
                fields=['collection', 'source'],
                name='unique_collection_source'
            )
        ]

    def __str__(self):
        return f"{self.source.title} in {self.collection.name}"


class SourceVerification(models.Model):
    """
    Audit log of publication verification checks performed against registries.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.CASCADE,
        related_name='verifications'
    )
    verification_status = models.CharField(
        max_length=50,
        choices=VerificationStatus.choices
    )
    verified_by_provider = models.CharField(
        max_length=50,
        help_text='Provider used: OPENALEX, CROSSREF, SEMANTIC_SCHOLAR, MANUAL'
    )
    comparison_details = models.JSONField(
        default=dict,
        help_text='Title, author, year comparison scores and differences'
    )
    retraction_detected = models.BooleanField(default=False)
    error_details = models.TextField(blank=True)
    verified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Source Verification'
        verbose_name_plural = 'Source Verifications'
        ordering = ['-verified_at']

    def __str__(self):
        return f"Verification for {self.source.title}: {self.verification_status}"


class SourceDocument(models.Model):
    """
    Uploaded research document (PDF, DOCX, BibTeX, RIS) for extraction and grounding.
    """
    class FileType(models.TextChoices):
        PDF = 'PDF', 'PDF Document'
        DOCX = 'DOCX', 'Word Document'
        BIBTEX = 'BIBTEX', 'BibTeX File'
        RIS = 'RIS', 'RIS Citation File'

    class ExtractionStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Extraction'
        EXTRACTED = 'EXTRACTED', 'Successfully Extracted'
        FAILED = 'FAILED', 'Extraction Failed'
        UNSUPPORTED = 'UNSUPPORTED', 'Unsupported or Inaccessible Format'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_documents'
    )
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_documents'
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50, choices=FileType.choices)
    file_size = models.PositiveIntegerField(help_text='Size in bytes')
    file_path = models.CharField(max_length=1000, blank=True)
    extraction_status = models.CharField(
        max_length=50,
        choices=ExtractionStatus.choices,
        default=ExtractionStatus.PENDING
    )
    extracted_text = models.TextField(blank=True)
    page_count = models.PositiveIntegerField(default=0)
    is_machine_readable = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Source Document'
        verbose_name_plural = 'Source Documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name} ({self.file_type})"


class SourceExcerpt(models.Model):
    """
    Segmented textual excerpt extracted from a SourceDocument with page/heading tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_document = models.ForeignKey(
        SourceDocument,
        on_delete=models.CASCADE,
        related_name='excerpts'
    )
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.CASCADE,
        related_name='excerpts',
        null=True,
        blank=True
    )
    page_number = models.PositiveIntegerField(null=True, blank=True)
    section_heading = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Source Excerpt'
        verbose_name_plural = 'Source Excerpts'
        ordering = ['page_number', 'created_at']

    def __str__(self):
        page_info = f"p. {self.page_number}" if self.page_number else "excerpt"
        return f"{self.source_document.file_name} [{page_info}]"


class LiteratureExtraction(models.Model):
    """
    Structured extraction from a research source (objectives, methodology, findings, limitations).
    """
    class ExtractionType(models.TextChoices):
        OBJECTIVES = 'OBJECTIVES', 'Research Objectives / Aims'
        METHODOLOGY = 'METHODOLOGY', 'Research Design & Methodology'
        FINDINGS = 'FINDINGS', 'Empirical Findings & Results'
        LIMITATIONS = 'LIMITATIONS', 'Limitations & Constraints'
        THEORETICAL_FRAMEWORK = 'THEORETICAL_FRAMEWORK', 'Theoretical Framework'
        VARIABLES = 'VARIABLES', 'Core Variables / Constructs'

    class EvidenceBasis(models.TextChoices):
        FULL_TEXT = 'FULL_TEXT', 'Full-Text Grounded'
        ABSTRACT = 'ABSTRACT', 'Abstract Grounded'
        METADATA_ONLY = 'METADATA_ONLY', 'Metadata Only'
        INSUFFICIENT = 'INSUFFICIENT', 'Insufficient Evidence'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source = models.ForeignKey(
        ResearchSource,
        on_delete=models.CASCADE,
        related_name='extractions'
    )
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='literature_extractions'
    )
    extraction_type = models.CharField(max_length=50, choices=ExtractionType.choices)
    content = models.TextField()
    evidence_basis = models.CharField(
        max_length=50,
        choices=EvidenceBasis.choices,
        default=EvidenceBasis.ABSTRACT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Literature Extraction'
        verbose_name_plural = 'Literature Extractions'
        ordering = ['source__title', 'extraction_type']

    def __str__(self):
        return f"{self.source.title} - {self.extraction_type} ({self.evidence_basis})"


class LiteratureReviewNote(models.Model):
    """
    Structured review elements in project workspace (Conceptual, Theoretical, Empirical, Systematic).
    """
    class ReviewType(models.TextChoices):
        CONCEPTUAL = 'CONCEPTUAL', 'Conceptual Review'
        THEORETICAL = 'THEORETICAL', 'Theoretical Review'
        EMPIRICAL = 'EMPIRICAL', 'Empirical Review'
        SYSTEMATIC = 'SYSTEMATIC', 'Systematic Review (PRISMA)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='literature_notes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    review_type = models.CharField(max_length=50, choices=ReviewType.choices)
    title = models.CharField(max_length=255)
    content = models.JSONField(
        default=dict,
        help_text='Structured matrix or notes (e.g. empirical table, theoretical framework)'
    )
    sources = models.ManyToManyField(
        ResearchSource,
        blank=True,
        related_name='literature_notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Literature Review Note'
        verbose_name_plural = 'Literature Review Notes'
        ordering = ['-updated_at']

    def __str__(self):
        return f"[{self.review_type}] {self.title}"


class CitationAudit(models.Model):
    """
    Persisted report of a manuscript citation and bibliography audit run.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='citation_audits'
    )
    document = models.ForeignKey(
        'documents.ResearchDocument',
        on_delete=models.CASCADE,
        related_name='citation_audits',
        null=True,
        blank=True
    )
    total_in_text_citations = models.PositiveIntegerField(default=0)
    total_bibliography_entries = models.PositiveIntegerField(default=0)
    uncited_bibliography_count = models.PositiveIntegerField(default=0)
    missing_bibliography_count = models.PositiveIntegerField(default=0)
    unverified_count = models.PositiveIntegerField(default=0)
    retracted_count = models.PositiveIntegerField(default=0)
    conflict_count = models.PositiveIntegerField(default=0)
    audit_report = models.JSONField(
        default=dict,
        help_text='Categorized audit diagnostics and recommendations'
    )
    audited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Citation Audit'
        verbose_name_plural = 'Citation Audits'
        ordering = ['-audited_at']

    def __str__(self):
        return f"Citation Audit for {self.project.title} at {self.audited_at.strftime('%Y-%m-%d %H:%M')}"


class ResearchSearchJob(models.Model):
    """
    Log of academic literature discovery queries for history and rate-limit tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='search_jobs'
    )
    query = models.CharField(max_length=500)
    filters = models.JSONField(default=dict, blank=True)
    provider = models.CharField(max_length=50, default='ALL')
    results_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Research Search Job'
        verbose_name_plural = 'Research Search Jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Search '{self.query}' by {self.user.email}"


class AIJobStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'


class AIJob(models.Model):
    """
    Asynchronous AI research jobs tracking prompts, responses, token usage,
    and academic integrity compliance.
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


# ==============================================================================
# STAGE 4 MODELS: METHODOLOGY, INSTRUMENTS, DATASETS & ANALYSIS INTELLIGENCE
# ==============================================================================

class ResearchMethodology(models.Model):
    """
    Project-specific methodology configuration and research design specification.
    """
    APPROACH_CHOICES = [
        ('QUANTITATIVE', 'Quantitative'),
        ('QUALITATIVE', 'Qualitative'),
        ('MIXED_METHODS', 'Mixed Methods'),
        ('DISCIPLINE_SPECIFIC', 'Discipline Specific'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='methodology'
    )
    approach = models.CharField(max_length=50, choices=APPROACH_CHOICES, default='QUANTITATIVE')
    design_type = models.CharField(max_length=100, default='DESCRIPTIVE_SURVEY')
    design_rationale = models.TextField(blank=True)
    study_location = models.CharField(max_length=255, blank=True)
    target_population = models.TextField(blank=True)
    unit_of_analysis = models.CharField(max_length=100, blank=True)
    sampling_frame = models.TextField(blank=True)
    sampling_method = models.CharField(max_length=100, blank=True)
    sample_size_planned = models.PositiveIntegerField(null=True, blank=True)
    data_sources = models.JSONField(default=list, blank=True)
    data_collection_procedure = models.TextField(blank=True)
    ethical_considerations = models.TextField(blank=True)
    planned_analysis_methods = models.JSONField(default=list, blank=True)
    is_approved = models.BooleanField(default=False)
    revisions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Methodology'
        verbose_name_plural = 'Research Methodologies'

    def __str__(self):
        return f"{self.design_type} ({self.approach}) for {self.project.title}"


class ResearchVariable(models.Model):
    """
    Structured variables, constructs, and indicators configured for a research project.
    """
    VARIABLE_TYPE_CHOICES = [
        ('INDEPENDENT', 'Independent Variable'),
        ('DEPENDENT', 'Dependent Variable'),
        ('MODERATING', 'Moderating Variable'),
        ('MEDIATING', 'Mediating Variable'),
        ('CONTROL', 'Control Variable'),
    ]
    SCALE_CHOICES = [
        ('NOMINAL', 'Nominal'),
        ('ORDINAL', 'Ordinal'),
        ('INTERVAL', 'Interval'),
        ('RATIO', 'Ratio'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='variables'
    )
    name = models.CharField(max_length=255)
    variable_type = models.CharField(max_length=50, choices=VARIABLE_TYPE_CHOICES, default='INDEPENDENT')
    scale_of_measurement = models.CharField(max_length=50, choices=SCALE_CHOICES, default='INTERVAL')
    operational_definition = models.TextField(blank=True)
    indicators = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Variable'
        verbose_name_plural = 'Research Variables'
        ordering = ['variable_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.variable_type})"


class SamplingPlan(models.Model):
    """
    Sample size planning with formal formulas (Cochran, Yamane, Krejcie-Morgan, Power).
    """
    FORMULA_CHOICES = [
        ('COCHRAN', "Cochran's Formula"),
        ('YAMANE', "Yamane's Formula"),
        ('KREJCIE_MORGAN', "Krejcie & Morgan (1970)"),
        ('POWER_ANALYSIS', "Statistical Power Analysis"),
        ('QUALITATIVE_PURPOSIVE', "Qualitative Purposive/Saturation"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='sampling_plans'
    )
    formula_type = models.CharField(max_length=50, choices=FORMULA_CHOICES)
    population_size = models.PositiveIntegerField(null=True, blank=True)
    margin_of_error = models.FloatField(default=0.05)
    confidence_level = models.FloatField(default=0.95)
    estimated_proportion = models.FloatField(default=0.50)
    nonresponse_rate = models.FloatField(default=0.10)
    statistical_power = models.FloatField(null=True, blank=True, default=0.80)
    effect_size = models.FloatField(null=True, blank=True, default=0.30)
    calculated_sample_size = models.PositiveIntegerField(default=0)
    adjusted_sample_size = models.PositiveIntegerField(default=0)
    rationale = models.TextField(blank=True)
    limitations = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Sampling Plan'
        verbose_name_plural = 'Sampling Plans'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.formula_type} (n={self.adjusted_sample_size}) for {self.project.title}"


class ResearchInstrument(models.Model):
    """
    Research measurement instruments: questionnaires, interview guides, observation checklists.
    """
    INSTRUMENT_TYPE_CHOICES = [
        ('QUESTIONNAIRE', 'Survey Questionnaire'),
        ('INTERVIEW_GUIDE', 'Interview Guide'),
        ('OBSERVATION_CHECKLIST', 'Observation Checklist'),
        ('FOCUS_GROUP_GUIDE', 'Focus Group Guide'),
        ('DATA_EXTRACTION_FORM', 'Data Extraction Form'),
        ('EXPERIMENTAL_RECORDING_SHEET', 'Experimental Recording Sheet'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='instruments'
    )
    title = models.CharField(max_length=255)
    instrument_type = models.CharField(
        max_length=50,
        choices=INSTRUMENT_TYPE_CHOICES,
        default='QUESTIONNAIRE'
    )
    description = models.TextField(blank=True)
    target_respondents = models.CharField(max_length=255, blank=True)
    administration_mode = models.CharField(max_length=50, default='SELF_ADMINISTERED')
    is_validated_scale = models.BooleanField(default=False)
    validation_evidence = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Instrument'
        verbose_name_plural = 'Research Instruments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.instrument_type})"


class InstrumentItem(models.Model):
    """
    Individual questions or indicators belonging to an instrument.
    """
    ITEM_TYPE_CHOICES = [
        ('LIKERT_5', '5-Point Likert Scale'),
        ('LIKERT_7', '7-Point Likert Scale'),
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('OPEN_ENDED', 'Open Ended Text'),
        ('DEMOGRAPHIC', 'Demographic Question'),
        ('BINARY', 'Yes / No Binary'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instrument = models.ForeignKey(
        ResearchInstrument,
        on_delete=models.CASCADE,
        related_name='items'
    )
    construct_name = models.CharField(max_length=255, blank=True)
    dimension = models.CharField(max_length=255, blank=True)
    item_text = models.TextField()
    item_type = models.CharField(max_length=50, choices=ITEM_TYPE_CHOICES, default='LIKERT_5')
    options = models.JSONField(default=list, blank=True)
    is_reverse_coded = models.BooleanField(default=False)
    is_required = models.BooleanField(default=True)
    order_index = models.PositiveIntegerField(default=0)
    variable = models.ForeignKey(
        ResearchVariable,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instrument_items'
    )

    class Meta:
        verbose_name = 'Instrument Item'
        verbose_name_plural = 'Instrument Items'
        ordering = ['order_index', 'id']

    def __str__(self):
        return f"Item {self.order_index}: {self.item_text[:40]}"


class ResearchDataset(models.Model):
    """
    Uploaded and managed datasets (CSV, XLSX, JSON) with strict private ownership.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='datasets'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_datasets'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    original_filename = models.CharField(max_length=255)
    file_format = models.CharField(max_length=20, default='CSV')
    file = models.FileField(upload_to='uploads/datasets/%Y/%m/')
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    row_count = models.PositiveIntegerField(default=0)
    column_count = models.PositiveIntegerField(default=0)
    columns_schema = models.JSONField(default=dict, blank=True)
    is_sensitive = models.BooleanField(default=False)
    current_version_number = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Dataset'
        verbose_name_plural = 'Research Datasets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.row_count} rows, {self.column_count} cols)"


class DatasetVersion(models.Model):
    """
    Immutable version snapshot of cleaned or transformed datasets.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(
        ResearchDataset,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to='uploads/datasets/versions/%Y/%m/')
    row_count = models.PositiveIntegerField()
    column_count = models.PositiveIntegerField()
    summary_statistics = models.JSONField(default=dict, blank=True)
    change_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Dataset Version'
        verbose_name_plural = 'Dataset Versions'
        unique_together = ('dataset', 'version_number')
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.dataset.name} v{self.version_number}"


class DataTransformation(models.Model):
    """
    Controlled reproducible data cleaning and transformation record.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    dataset = models.ForeignKey(
        ResearchDataset,
        on_delete=models.CASCADE,
        related_name='transformations'
    )
    transformation_type = models.CharField(max_length=50)
    parameters = models.JSONField(default=dict, blank=True)
    records_affected = models.PositiveIntegerField(default=0)
    from_version = models.PositiveIntegerField()
    to_version = models.PositiveIntegerField()
    is_approved = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Data Transformation'
        verbose_name_plural = 'Data Transformations'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transformation_type} on {self.dataset.name} (v{self.from_version}->v{self.to_version})"


class AnalysisJob(models.Model):
    """
    Execution job for deterministic statistical or qualitative analysis.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='analysis_jobs'
    )
    dataset = models.ForeignKey(
        ResearchDataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analysis_jobs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='analysis_jobs'
    )
    analysis_type = models.CharField(max_length=50)
    parameters = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, default='PENDING')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Analysis Job'
        verbose_name_plural = 'Analysis Jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.analysis_type} ({self.status}) for {self.project.title}"


class StatisticalResult(models.Model):
    """
    Exact, reproducible results computed by the statistical calculation engine.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.OneToOneField(
        AnalysisJob,
        on_delete=models.CASCADE,
        related_name='statistical_result'
    )
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='statistical_results'
    )
    dataset = models.ForeignKey(
        ResearchDataset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    analysis_type = models.CharField(max_length=50)
    sample_size = models.PositiveIntegerField(default=0)
    metrics = models.JSONField(default=dict, blank=True)
    tables = models.JSONField(default=list, blank=True)
    assumptions_diagnostics = models.JSONField(default=dict, blank=True)
    effect_sizes = models.JSONField(default=dict, blank=True)
    p_values = models.JSONField(default=dict, blank=True)
    confidence_intervals = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Statistical Result'
        verbose_name_plural = 'Statistical Results'
        ordering = ['-created_at']

    def __str__(self):
        return f"Result: {self.analysis_type} (N={self.sample_size})"

    @property
    def label(self):
        return f"{self.analysis_type} on {self.dataset.name if self.dataset else 'Dataset'}"


class HypothesisTest(models.Model):
    """
    Formal mapping of research hypotheses to computed statistical tests.
    """
    DECISION_CHOICES = [
        ('REJECT_NULL', 'Reject Null Hypothesis (H0)'),
        ('FAIL_TO_REJECT_NULL', 'Fail to Reject Null Hypothesis (H0)'),
        ('INCONCLUSIVE', 'Inconclusive Result'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='hypothesis_tests'
    )
    statistical_result = models.ForeignKey(
        StatisticalResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hypothesis_tests'
    )
    hypothesis_text = models.TextField()
    null_hypothesis = models.TextField(blank=True)
    alternative_hypothesis = models.TextField(blank=True)
    test_type = models.CharField(max_length=50)
    independent_vars = models.JSONField(default=list, blank=True)
    dependent_var = models.CharField(max_length=255, blank=True)
    significance_level = models.FloatField(default=0.05)
    test_statistic_value = models.FloatField(null=True, blank=True)
    p_value = models.FloatField(null=True, blank=True)
    decision = models.CharField(max_length=30, choices=DECISION_CHOICES, default='FAIL_TO_REJECT_NULL')
    effect_size = models.CharField(max_length=100, blank=True)
    substantive_interpretation = models.TextField(blank=True)
    limitations = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hypothesis Test'
        verbose_name_plural = 'Hypothesis Tests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.decision}: {self.hypothesis_text[:40]}"

    @property
    def hypothesis_statement(self):
        return self.hypothesis_text


class QualitativeTranscript(models.Model):
    """
    Transcripts of interviews, focus groups, or observation notes for qualitative analysis.
    """
    TRANSCRIPT_TYPE_CHOICES = [
        ('INTERVIEW', 'Interview Transcript'),
        ('FOCUS_GROUP', 'Focus Group Transcript'),
        ('OBSERVATION_NOTE', 'Researcher Observation Note'),
        ('OPEN_ENDED_SURVEY', 'Open-Ended Survey Response'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='transcripts'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=255)
    transcript_type = models.CharField(
        max_length=50,
        choices=TRANSCRIPT_TYPE_CHOICES,
        default='INTERVIEW'
    )
    participant_pseudonym = models.CharField(max_length=100, blank=True)
    content = models.TextField()
    word_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Qualitative Transcript'
        verbose_name_plural = 'Qualitative Transcripts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.participant_pseudonym or self.transcript_type})"


class QualitativeCode(models.Model):
    """
    Qualitative codes assigned to transcript excerpts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='qualitative_codes'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default='#1e3a8a')
    is_ai_suggested = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Qualitative Code'
        verbose_name_plural = 'Qualitative Codes'
        ordering = ['name']

    def __str__(self):
        return self.name


class EvidenceExcerpt(models.Model):
    """
    Exact verbatim transcript excerpts linked to qualitative codes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='evidence_excerpts'
    )
    transcript = models.ForeignKey(
        QualitativeTranscript,
        on_delete=models.CASCADE,
        related_name='excerpts'
    )
    code = models.ForeignKey(
        QualitativeCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='excerpts'
    )
    quote_text = models.TextField()
    start_char = models.PositiveIntegerField()
    end_char = models.PositiveIntegerField()
    researcher_memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Evidence Excerpt'
        verbose_name_plural = 'Evidence Excerpts'
        ordering = ['start_char']

    def __str__(self):
        return f"Excerpt [{self.start_char}-{self.end_char}]: {self.quote_text[:40]}"


class QualitativeTheme(models.Model):
    """
    Higher-order qualitative themes synthesized from coded evidence excerpts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='qualitative_themes'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    codes = models.ManyToManyField(
        QualitativeCode,
        related_name='themes',
        blank=True
    )
    is_ai_suggested = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    summary_narrative = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Qualitative Theme'
        verbose_name_plural = 'Qualitative Themes'
        ordering = ['title']

    def __str__(self):
        return self.title


class ResearchVisualization(models.Model):
    """
    Charts and tabular visualizations derived directly from real analysis outputs.
    """
    CHART_TYPE_CHOICES = [
        ('BAR', 'Bar Chart'),
        ('LINE', 'Line Chart'),
        ('HISTOGRAM', 'Histogram'),
        ('SCATTER', 'Scatter Plot'),
        ('BOX_PLOT', 'Box Plot'),
        ('PIE_CATEGORICAL', 'Categorical Pie / Donut'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='visualizations'
    )
    statistical_result = models.ForeignKey(
        StatisticalResult,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visualizations'
    )
    chart_type = models.CharField(max_length=50, choices=CHART_TYPE_CHOICES, default='BAR')
    title = models.CharField(max_length=255)
    x_label = models.CharField(max_length=100, blank=True)
    y_label = models.CharField(max_length=100, blank=True)
    chart_config = models.JSONField(default=dict, blank=True)
    tabular_html = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Research Visualization'
        verbose_name_plural = 'Research Visualizations'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.chart_type})"


# ============================================================================
# STAGE 5: WORKFLOW, PLANNING, ASSEMBLY, ALIGNMENT & QUALITY ASSURANCE MODELS
# ============================================================================

class ResearchWorkflow(models.Model):
    """Integrated 12-stage research lifecycle tracker with real data progress."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='workflow'
    )
    document_category = models.CharField(max_length=100, default='Empirical Research')
    overall_progress_percentage = models.FloatField(default=0.0)
    current_stage = models.CharField(max_length=100, default='Research Setup')
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Workflow'
        verbose_name_plural = 'Research Workflows'

    def __str__(self):
        return f'Workflow: {self.project.title} ({self.overall_progress_percentage:.1f}%)'


class WorkflowStep(models.Model):
    """Individual lifecycle stage within a project workflow."""
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('NEEDS_REVIEW', 'Needs Review'),
        ('APPROVED', 'Approved'),
        ('BLOCKED', 'Blocked'),
        ('COMPLETED', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        ResearchWorkflow,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    stage_id = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=1)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='NOT_STARTED')
    is_mandatory = models.BooleanField(default=True)
    progress_percentage = models.FloatField(default=0.0)
    completion_criteria = models.JSONField(default=dict, blank=True)
    action_url = models.CharField(max_length=255, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_workflow_steps'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Workflow Step'
        verbose_name_plural = 'Workflow Steps'
        ordering = ['order']

    def __str__(self):
        return f'{self.order}. {self.title} [{self.status}]'


class ResearchDecision(models.Model):
    """Approved research planning choices and conceptual foundations."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='planning_decision'
    )
    title_confirmed = models.BooleanField(default=False)
    problem_statement = models.TextField(blank=True)
    research_aim = models.TextField(blank=True)
    objectives = models.JSONField(default=list, blank=True)
    research_questions = models.JSONField(default=list, blank=True)
    hypotheses = models.JSONField(default=list, blank=True)
    variables_and_constructs = models.JSONField(default=list, blank=True)
    conceptual_relationships = models.JSONField(default=list, blank=True)
    scope_and_delimitation = models.TextField(blank=True)
    limitations = models.TextField(blank=True)
    proposed_methodology = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_research_decisions'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    audit_trail = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Decision'
        verbose_name_plural = 'Research Decisions'

    def __str__(self):
        return f'Research Plan: {self.project.title} (Approved: {self.is_approved})'

    @property
    def status(self):
        return "APPROVED" if self.is_approved else "PENDING_REVIEW"


class ResearchAlignmentMatrix(models.Model):
    """Comprehensive alignment matrix connecting objectives, methodology, and findings."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='alignment_matrix'
    )
    overall_alignment_score = models.FloatField(default=0.0)
    matrix_data = models.JSONField(default=dict, blank=True)
    unaligned_count = models.IntegerField(default=0)
    last_calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Research Alignment Matrix'
        verbose_name_plural = 'Research Alignment Matrices'

    def __str__(self):
        return f'Alignment Matrix: {self.project.title} (Score: {self.overall_alignment_score:.1f}%)'


class AlignmentIssue(models.Model):
    """Specific misalignment or disconnect flagged by the Alignment Engine."""
    SEVERITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    matrix = models.ForeignKey(
        ResearchAlignmentMatrix,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    issue_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='MEDIUM')
    description = models.TextField()
    recommendation = models.TextField(blank=True)
    source_element = models.CharField(max_length=100, blank=True)
    target_element = models.CharField(max_length=100, blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Alignment Issue'
        verbose_name_plural = 'Alignment Issues'
        ordering = ['-severity', '-created_at']

    def __str__(self):
        return f'[{self.severity}] {self.issue_type}: {self.description[:60]}'


class ManuscriptAssembly(models.Model):
    """Compiled full academic manuscript with all sections, tables, and bibliography."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='assemblies'
    )
    assembled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='manuscript_assemblies'
    )
    document_title = models.CharField(max_length=255)
    citation_style = models.CharField(max_length=50, default='APA 7th')
    include_preliminary_pages = models.BooleanField(default=True)
    include_table_of_contents = models.BooleanField(default=True)
    include_list_of_tables = models.BooleanField(default=True)
    include_list_of_figures = models.BooleanField(default=True)
    include_references = models.BooleanField(default=True)
    include_appendices = models.BooleanField(default=True)
    total_word_count = models.IntegerField(default=0)
    total_tables_count = models.IntegerField(default=0)
    total_figures_count = models.IntegerField(default=0)
    total_citations_count = models.IntegerField(default=0)
    compiled_html = models.TextField(blank=True)
    structure_manifest = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Manuscript Assembly'
        verbose_name_plural = 'Manuscript Assemblies'
        ordering = ['-created_at']

    def __str__(self):
        return f'Assembly: {self.document_title} ({self.total_word_count} words)'

    @property
    def assembled_html(self):
        return self.compiled_html

    @property
    def status(self):
        return 'COMPLETED'

    @property
    def reference_count(self):
        return self.total_citations_count

    @property
    def table_count(self):
        return self.total_tables_count

    @property
    def figure_count(self):
        return self.total_figures_count

    @property
    def total_words(self):
        return self.total_word_count

    @property
    def version_number(self):
        if not self.pk:
            return 1
        count = ManuscriptAssembly.objects.filter(
            project_id=self.project_id,
            created_at__lte=self.created_at
        ).count()
        return max(1, count)


class ManuscriptValidation(models.Model):
    """Academic document checker audit assessing readiness across 6 categories."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='validations'
    )
    total_issues_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    warning_count = models.IntegerField(default=0)
    info_count = models.IntegerField(default=0)
    category_scores = models.JSONField(default=dict, blank=True)
    readiness_score = models.FloatField(default=0.0)
    disclaimer = models.TextField(
        default='Academic Quality Assurance check for scholarly standards. ScholarForge AI does not guarantee journal publication or institutional grading acceptance.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Manuscript Validation'
        verbose_name_plural = 'Manuscript Validations'
        ordering = ['-created_at']

    def __str__(self):
        return f'Validation: {self.project.title} (Readiness: {self.readiness_score:.1f}%)'

    @property
    def overall_score(self):
        return self.readiness_score

    @property
    def readiness_rating(self):
        if self.readiness_score >= 85.0:
            return 'EXEMPLARY'
        elif self.readiness_score >= 70.0:
            return 'SUBMISSION_READY'
        elif self.readiness_score >= 50.0:
            return 'NEEDS_REVISION'
        return 'NOT_READY'


class ValidationIssue(models.Model):
    """Specific scholarly defect or quality recommendation flagged during audit."""
    CATEGORY_CHOICES = [
        ('STRUCTURAL_QUALITY', 'Structural Quality'),
        ('RESEARCH_CONSISTENCY', 'Research Consistency'),
        ('CITATION_INTEGRITY', 'Citation Integrity'),
        ('EVIDENCE_VALIDITY', 'Evidence Validity'),
        ('WRITING_QUALITY', 'Writing Quality'),
        ('MANUSCRIPT_COMPLETENESS', 'Manuscript Completeness'),
    ]
    SEVERITY_CHOICES = [
        ('ERROR', 'Error'),
        ('WARNING', 'Warning'),
        ('INFO', 'Info'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    validation = models.ForeignKey(
        ManuscriptValidation,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='WARNING')
    section_name = models.CharField(max_length=150, blank=True)
    message = models.TextField()
    academic_suggestion = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Validation Issue'
        verbose_name_plural = 'Validation Issues'
        ordering = ['-severity', 'category']

    def __str__(self):
        return f'[{self.severity}] {self.category}: {self.message[:60]}'


class ReviewRecord(models.Model):
    """Formal internal review and approval checkpoints before manuscript submission."""
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('READY_FOR_INTERNAL_REVIEW', 'Ready for Internal Review'),
        ('REVISIONS_REQUIRED', 'Revisions Required'),
        ('APPROVED_DRAFT', 'Approved Draft'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_reviews'
    )
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default='DRAFT')
    comments = models.TextField(blank=True)
    review_checklist = models.JSONField(default=dict, blank=True)
    action_items = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Review Record'
        verbose_name_plural = 'Review Records'
        ordering = ['-created_at']

    def __str__(self):
        return f'Review [{self.status}]: {self.project.title}'


# ============================================================================
# STAGE 6: ACADEMIC COLLABORATION, SUPERVISOR REVIEW & REVISION MANAGEMENT
# ============================================================================

class CollaboratorRole(models.TextChoices):
    PROJECT_OWNER = 'PROJECT_OWNER', 'Project Owner'
    SUPERVISOR = 'SUPERVISOR', 'Supervisor'
    CO_AUTHOR = 'CO_AUTHOR', 'Co-Author'
    ACADEMIC_REVIEWER = 'ACADEMIC_REVIEWER', 'Academic Reviewer'
    VIEWER = 'VIEWER', 'Viewer'


class ProjectCollaborator(models.Model):
    """
    Project-level collaborator assignment with granular academic roles.
    Isolates project permissions without granting workspace-wide access.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='collaborators'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='project_collaborations'
    )
    role = models.CharField(
        max_length=40,
        choices=CollaboratorRole.choices,
        default=CollaboratorRole.VIEWER
    )
    assigned_sections = models.JSONField(
        default=list,
        blank=True,
        help_text="Optional list of section IDs this collaborator is authorized to edit or review."
    )
    is_active = models.BooleanField(default=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Project Collaborator'
        verbose_name_plural = 'Project Collaborators'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['project', 'user'],
                name='unique_project_collaborator_user'
            )
        ]

    def __str__(self):
        return f'{self.user.email} - {self.role} on {self.project.title}'


class InvitationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    REJECTED = 'REJECTED', 'Rejected'
    REVOKED = 'REVOKED', 'Revoked'
    EXPIRED = 'EXPIRED', 'Expired'


class ProjectInvitation(models.Model):
    """
    Secure, email-based, expiring invitation tokens for project collaboration.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_project_invitations'
    )
    invitee_email = models.EmailField()
    role = models.CharField(
        max_length=40,
        choices=CollaboratorRole.choices,
        default=CollaboratorRole.VIEWER
    )
    assigned_sections = models.JSONField(default=list, blank=True)
    token = models.CharField(max_length=128, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Project Invitation'
        verbose_name_plural = 'Project Invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invite for {self.invitee_email} as {self.role} ({self.status})'

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at


class CommentStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    RESOLVED = 'RESOLVED', 'Resolved'
    ORPHANED = 'ORPHANED', 'Orphaned'


class ManuscriptComment(models.Model):
    """
    Inline manuscript annotations and discussion threads tied to stable text anchors.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='manuscript_comments'
    )
    document = models.ForeignKey(
        'documents.ResearchDocument',
        on_delete=models.CASCADE,
        related_name='comments'
    )
    section = models.ForeignKey(
        'documents.DocumentSection',
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='manuscript_comments'
    )
    anchor_text = models.TextField(help_text="Exact text snippet highlighted by the reviewer.")
    anchor_prefix = models.TextField(blank=True, help_text="Contextual text immediately preceding the anchor.")
    anchor_suffix = models.TextField(blank=True, help_text="Contextual text immediately succeeding the anchor.")
    start_offset = models.IntegerField(default=0)
    end_offset = models.IntegerField(default=0)
    document_version_number = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=CommentStatus.choices,
        default=CommentStatus.OPEN
    )
    content = models.TextField()
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='resolved_comments'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Manuscript Comment'
        verbose_name_plural = 'Manuscript Comments'
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.author.email} on "{self.anchor_text[:30]}" [{self.status}]'


class CommentReply(models.Model):
    """
    Threaded replies attached to an inline manuscript comment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment = models.ForeignKey(
        ManuscriptComment,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_replies'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Comment Reply'
        verbose_name_plural = 'Comment Replies'
        ordering = ['created_at']

    def __str__(self):
        return f'Reply by {self.author.email} on {self.created_at}'


class FeedbackSourceType(models.TextChoices):
    MANUAL_ENTRY = 'MANUAL_ENTRY', 'Manual Entry'
    DOCX_UPLOAD = 'DOCX_UPLOAD', 'DOCX Upload'
    PDF_UPLOAD = 'PDF_UPLOAD', 'PDF Upload'
    INLINE_THREAD_IMPORT = 'INLINE_THREAD_IMPORT', 'Inline Thread Import'


FeedbackSourceType.MANUAL = FeedbackSourceType.MANUAL_ENTRY
FeedbackSourceType.DOCX = FeedbackSourceType.DOCX_UPLOAD
FeedbackSourceType.PDF = FeedbackSourceType.PDF_UPLOAD
FeedbackSourceType.INLINE_THREAD = FeedbackSourceType.INLINE_THREAD_IMPORT


class SupervisorFeedback(models.Model):
    """
    Uploaded supervisor review documents, tracked changes, or manual comments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='supervisor_feedbacks'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_feedbacks'
    )
    source_type = models.CharField(
        max_length=30,
        choices=FeedbackSourceType.choices,
        default=FeedbackSourceType.MANUAL_ENTRY
    )
    title = models.CharField(max_length=255)
    raw_content = models.TextField(blank=True)
    file_attachment = models.FileField(upload_to='supervisor_feedback/', blank=True, null=True)
    extracted_comments = models.JSONField(default=list, blank=True)
    has_unextracted_annotations = models.BooleanField(
        default=False,
        help_text="True if file (e.g. PDF) may have graphical annotations requiring manual review."
    )
    is_analyzed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Supervisor Feedback'
        verbose_name_plural = 'Supervisor Feedbacks'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.source_type}) - {self.project.title}'


class CorrectionCategory(models.TextChoices):
    GRAMMAR_AND_CLARITY = 'GRAMMAR_AND_CLARITY', 'Grammar and Clarity'
    ACADEMIC_TONE = 'ACADEMIC_TONE', 'Academic Tone'
    RESEARCH_OBJECTIVES = 'RESEARCH_OBJECTIVES', 'Research Objectives'
    RESEARCH_QUESTIONS = 'RESEARCH_QUESTIONS', 'Research Questions'
    HYPOTHESIS_FORMULATION = 'HYPOTHESIS_FORMULATION', 'Hypothesis Formulation'
    CONCEPTUAL_REVIEW = 'CONCEPTUAL_REVIEW', 'Conceptual Review'
    THEORETICAL_FRAMEWORK = 'THEORETICAL_FRAMEWORK', 'Theoretical Framework'
    EMPIRICAL_LITERATURE = 'EMPIRICAL_LITERATURE', 'Empirical Literature Review'
    RESEARCH_METHODOLOGY = 'RESEARCH_METHODOLOGY', 'Research Methodology'
    STATISTICAL_INTERPRETATION = 'STATISTICAL_INTERPRETATION', 'Statistical Interpretation'
    CITATION_CORRECTION = 'CITATION_CORRECTION', 'Citation Correction'
    MANUSCRIPT_STRUCTURE = 'MANUSCRIPT_STRUCTURE', 'Manuscript Structure'
    FORMATTING = 'FORMATTING', 'Formatting'
    UNSUPPORTED_CLAIMS = 'UNSUPPORTED_CLAIMS', 'Unsupported Claims'
    OTHER = 'OTHER', 'Other'


class CorrectionTaskStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    PROPOSED = 'PROPOSED', 'Proposed'
    READY_FOR_REVIEW = 'READY_FOR_REVIEW', 'Ready for Review'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    RESOLVED = 'RESOLVED', 'Resolved'
    REOPENED = 'REOPENED', 'Reopened'


class CorrectionPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class CorrectionTask(models.Model):
    """
    Actionable correction task derived from supervisor feedback or inline review.
    Enforces optimistic concurrency checks and tracks revision approval lifecycle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='correction_tasks'
    )
    feedback_source = models.ForeignKey(
        SupervisorFeedback,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tasks'
    )
    linked_comment = models.ForeignKey(
        ManuscriptComment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='linked_tasks'
    )
    section = models.ForeignKey(
        'documents.DocumentSection',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='correction_tasks'
    )
    category = models.CharField(
        max_length=60,
        choices=CorrectionCategory.choices,
        default=CorrectionCategory.OTHER
    )
    priority = models.CharField(
        max_length=20,
        choices=CorrectionPriority.choices,
        default=CorrectionPriority.MEDIUM
    )
    status = models.CharField(
        max_length=30,
        choices=CorrectionTaskStatus.choices,
        default=CorrectionTaskStatus.OPEN
    )
    title = models.CharField(max_length=255)
    instruction = models.TextField()
    original_text = models.TextField(blank=True)
    proposed_text = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    resolution_notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_correction_tasks'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_correction_tasks'
    )
    applied_version_number = models.PositiveIntegerField(null=True, blank=True)
    expected_base_version = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optimistic concurrency: version of document when proposition was prepared."
    )
    is_stale_after_subsequent_edit = models.BooleanField(
        default=False,
        help_text="Flagged true if section was edited again after approval, requiring re-review."
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def supervisor_instruction(self):
        return self.instruction

    @supervisor_instruction.setter
    def supervisor_instruction(self, value):
        self.instruction = value

    class Meta:
        verbose_name = 'Correction Task'
        verbose_name_plural = 'Correction Tasks'
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f'[{self.status}] {self.category}: {self.title}'


class RevisionCategory(models.TextChoices):
    MAJOR = 'MAJOR', 'Major Revision'
    MINOR = 'MINOR', 'Minor Revision'
    CLARIFICATION = 'CLARIFICATION', 'Clarification'
    REJECT_REQUEST = 'REJECT_REQUEST', 'Rebuttal / Declined Revision'


class JournalReviewerResponse(models.Model):
    """
    Point-by-point response to external journal reviewers (Reviewer 1, Reviewer 2, Editor).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='journal_responses'
    )
    reviewer_label = models.CharField(
        max_length=100,
        help_text="e.g., 'Reviewer 1', 'Reviewer 2', 'Associate Editor'"
    )
    comment_number = models.PositiveIntegerField(default=1)
    original_comment = models.TextField()
    revision_category = models.CharField(
        max_length=30,
        choices=RevisionCategory.choices,
        default=RevisionCategory.MINOR
    )
    target_section = models.ForeignKey(
        'documents.DocumentSection',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='journal_responses'
    )
    linked_correction_task = models.ForeignKey(
        CorrectionTask,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='journal_responses'
    )
    author_response = models.TextField(blank=True)
    manuscript_change_summary = models.TextField(blank=True)
    is_verified_applied = models.BooleanField(
        default=False,
        help_text="Strictly verified only if linked correction has been applied to manuscript."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Journal Reviewer Response'
        verbose_name_plural = 'Journal Reviewer Responses'
        ordering = ['reviewer_label', 'comment_number']

    def __str__(self):
        return f'{self.reviewer_label} - Point #{self.comment_number} [{self.revision_category}]'


class CollaborationAuditEvent(models.Model):
    """
    Audit log of all collaboration, invitation, revision, and review actions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='collaboration_audits'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    event_type = models.CharField(max_length=60)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Collaboration Audit Event'
        verbose_name_plural = 'Collaboration Audit Events'
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.event_type} by {self.actor.email if self.actor else "system"} on {self.timestamp}'


# ==============================================================================
# STAGE 7: UNIVERSITY ACADEMIC FORMATTING & JOURNAL PUBLICATION STANDARDS
# ==============================================================================

class AcademicInstitution(models.Model):
    """
    Hierarchical academic institution for university formatting standards.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    country = models.CharField(max_length=100)
    code = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    is_verified = models.BooleanField(default=False)
    verification_source = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Academic Institution'
        verbose_name_plural = 'Academic Institutions'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.country})"


class AcademicFaculty(models.Model):
    """
    Faculty or college within an academic institution (e.g. Faculty of Science).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='faculties'
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Academic Faculty'
        verbose_name_plural = 'Academic Faculties'
        ordering = ['institution', 'name']
        unique_together = ('institution', 'name')

    def __str__(self):
        return f"{self.name} - {self.institution.name}"


class AcademicDepartment(models.Model):
    """
    Department or school within a faculty (e.g. Department of Computer Science).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        AcademicFaculty,
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Academic Department'
        verbose_name_plural = 'Academic Departments'
        ordering = ['faculty', 'name']
        unique_together = ('faculty', 'name')

    def __str__(self):
        return f"{self.name} ({self.faculty.name})"


class TemplateType(models.TextChoices):
    INSTITUTIONAL = 'INSTITUTIONAL', 'Institutional Standard'
    JOURNAL = 'JOURNAL', 'Academic Journal'
    DISCIPLINE_STANDARD = 'DISCIPLINE_STANDARD', 'Discipline / Field Standard'
    CUSTOM = 'CUSTOM', 'Custom Researcher Template'


class TemplateDegreeLevel(models.TextChoices):
    UNDERGRADUATE = 'UNDERGRADUATE', 'Undergraduate'
    MASTERS = 'MASTERS', "Master's"
    PHD = 'PHD', 'PhD / Doctoral'
    POSTDOCTORAL = 'POSTDOCTORAL', 'Postdoctoral'
    PROFESSIONAL = 'PROFESSIONAL', 'Professional'
    GENERAL = 'GENERAL', 'General Academic'


class TemplateDocumentType(models.TextChoices):
    THESIS = 'THESIS', 'Thesis'
    DISSERTATION = 'DISSERTATION', 'Dissertation'
    PROJECT_REPORT = 'PROJECT_REPORT', 'Project Report'
    JOURNAL_ARTICLE = 'JOURNAL_ARTICLE', 'Journal Article'
    CONFERENCE_PAPER = 'CONFERENCE_PAPER', 'Conference Paper'
    RESEARCH_PROPOSAL = 'RESEARCH_PROPOSAL', 'Research Proposal'
    GENERAL = 'GENERAL', 'General Document'


class TemplateVerificationStatus(models.TextChoices):
    OFFICIALLY_VERIFIED = 'OFFICIALLY_VERIFIED', 'Officially Verified'
    COMMUNITY_VERIFIED = 'COMMUNITY_VERIFIED', 'Community Verified'
    USER_CUSTOMIZED = 'USER_CUSTOMIZED', 'User Customized'
    DRAFT = 'DRAFT', 'Draft / Unverified'
    ARCHIVED = 'ARCHIVED', 'Archived'


class FormattingTemplate(models.Model):
    """
    Academic formatting specification linked hierarchically to institutions,
    departments, journals, or general disciplinary standards.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    template_type = models.CharField(
        max_length=30,
        choices=TemplateType.choices,
        default=TemplateType.INSTITUTIONAL
    )
    institution = models.ForeignKey(
        AcademicInstitution,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='templates'
    )
    department = models.ForeignKey(
        AcademicDepartment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='templates'
    )
    degree_level = models.CharField(
        max_length=30,
        choices=TemplateDegreeLevel.choices,
        default=TemplateDegreeLevel.GENERAL
    )
    document_type = models.CharField(
        max_length=30,
        choices=TemplateDocumentType.choices,
        default=TemplateDocumentType.GENERAL
    )
    verification_status = models.CharField(
        max_length=30,
        choices=TemplateVerificationStatus.choices,
        default=TemplateVerificationStatus.DRAFT
    )
    guideline_version = models.CharField(max_length=50, blank=True, default='1.0')
    verification_evidence_summary = models.TextField(blank=True, help_text='Detailed authoritative citation and specific regulatory evidence confirming compliance rules')
    verification_source_url = models.URLField(
        blank=True,
        help_text="Authoritative institution-issued guideline or handbook URL"
    )
    verification_notes = models.TextField(blank=True)
    verification_date = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='verified_templates'
    )
    is_shared = models.BooleanField(
        default=True,
        help_text="Visible to all platform users as an institution standard"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Formatting Template'
        verbose_name_plural = 'Formatting Templates'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.verification_status}]"


class TemplateVersion(models.Model):
    """
    Immutable versioned rules snapshot for a formatting template.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        FormattingTemplate,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField(default=1)
    changelog = models.TextField(blank=True)
    rules_config = models.JSONField(
        default=dict,
        help_text="Structured JSON of page_settings, typography, chapter_structure, pagination, prelims, tables_figures, citation_reference, word_limits."
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Template Version'
        verbose_name_plural = 'Template Versions'
        ordering = ['template', '-version_number']
        unique_together = ('template', 'version_number')

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"


class TemplateGuidelineSource(models.Model):
    """
    Source guideline document (PDF/DOCX) uploaded to generate candidate rules.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        FormattingTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='guideline_sources'
    )
    title = models.CharField(max_length=255)
    file_attachment = models.FileField(upload_to='guideline_sources/', null=True, blank=True)
    extracted_text = models.TextField(blank=True)
    raw_guidelines = models.JSONField(default=dict, blank=True)
    prompt_injection_sanitized = models.BooleanField(default=True)
    extracted_rules = models.JSONField(default=dict, blank=True)
    review_status = models.CharField(
        max_length=30,
        default='PENDING_REVIEW',
        choices=[('PENDING_REVIEW', 'Pending Review'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')]
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_guidelines'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Template Guideline Source'
        verbose_name_plural = 'Template Guideline Sources'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.review_status})"


class JournalArticleType(models.TextChoices):
    ORIGINAL_RESEARCH = 'ORIGINAL_RESEARCH', 'Original Research (IMRaD)'
    REVIEW_ARTICLE = 'REVIEW_ARTICLE', 'Review Article'
    SYSTEMATIC_REVIEW = 'SYSTEMATIC_REVIEW', 'Systematic Review (PRISMA)'
    CONCEPTUAL_THEORETICAL = 'CONCEPTUAL_THEORETICAL', 'Conceptual / Theoretical Paper'


class JournalProfile(models.Model):
    """
    Academic journal specifications, scope, word limits, and required statements.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    publisher = models.CharField(max_length=255, blank=True)
    issn = models.CharField(max_length=50, blank=True)
    scope = models.TextField(blank=True)
    submission_url = models.URLField(blank=True)
    author_guidelines_url = models.URLField(blank=True)
    article_type = models.CharField(
        max_length=30,
        choices=JournalArticleType.choices,
        default=JournalArticleType.ORIGINAL_RESEARCH
    )
    word_limit = models.PositiveIntegerField(null=True, blank=True)
    abstract_word_limit = models.PositiveIntegerField(default=250)
    keyword_min = models.PositiveIntegerField(default=3)
    keyword_max = models.PositiveIntegerField(default=6)
    reference_limit = models.PositiveIntegerField(null=True, blank=True)
    required_sections = models.JSONField(default=list, blank=True)
    required_statements = models.JSONField(default=list, blank=True)
    citation_style = models.CharField(max_length=50, default='apa-7th')
    verification_status = models.CharField(
        max_length=30,
        choices=TemplateVerificationStatus.choices,
        default=TemplateVerificationStatus.DRAFT
    )
    guideline_version = models.CharField(max_length=50, default='1.0')
    verification_evidence_summary = models.TextField(
        blank=True,
        help_text="Detailed authoritative citation of author guidelines and editorial criteria"
    )
    last_reviewed_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Journal Profile'
        verbose_name_plural = 'Journal Profiles'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.publisher or 'Journal'})"


class ManuscriptMetadata(models.Model):
    """
    Author and publication metadata attached to a research project.
    Stores ORCIDs, affiliations, and mandatory ethics and funding declarations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='manuscript_metadata'
    )
    running_title = models.CharField(max_length=100, blank=True)
    corresponding_author_name = models.CharField(max_length=255, blank=True)
    corresponding_author_email = models.EmailField(blank=True)
    orcid_identifiers = models.JSONField(
        default=list,
        blank=True,
        help_text="List of objects: {'name': str, 'orcid': '0000-0002-1825-0097', 'is_verified': bool}"
    )
    affiliations = models.JSONField(
        default=list,
        blank=True,
        help_text="List of objects: {'institution': str, 'department': str, 'city': str, 'country': str}"
    )
    funding_statement = models.TextField(blank=True)
    conflict_of_interest_statement = models.TextField(blank=True)
    data_availability_statement = models.TextField(blank=True)
    ethics_approval_statement = models.TextField(blank=True)
    study_design_type = models.CharField(
        max_length=100,
        blank=True,
        default='EMPIRICAL_HUMAN',
        help_text="Study design methodology classification (e.g. EMPIRICAL_HUMAN, EMPIRICAL_ANIMAL, COMPUTATIONAL_SIMULATION, SYSTEMATIC_REVIEW, THEORETICAL, SECONDARY_OPEN_DATA)"
    )
    involves_human_or_animal_subjects = models.BooleanField(
        default=False,
        help_text="Whether study directly collects primary data from human participants or animal models"
    )
    ethics_exemption_reason = models.TextField(
        blank=True,
        help_text="Official institutional or regulatory exemption justification (e.g. secondary research on public de-identified data)"
    )
    author_contributions = models.JSONField(
        default=dict,
        blank=True,
        help_text="CRediT taxonomy role distribution map"
    )
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Manuscript Metadata'
        verbose_name_plural = 'Manuscript Metadata'

    def __str__(self):
        return f"Metadata for {self.project.title}"


class ProjectTemplateAssignment(models.Model):
    """
    Active formatting template assigned to a research project.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='template_assignment'
    )
    template = models.ForeignKey(
        FormattingTemplate,
        on_delete=models.CASCADE,
        related_name='project_assignments'
    )
    template_version = models.ForeignKey(
        TemplateVersion,
        on_delete=models.CASCADE,
        related_name='project_assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_templates'
    )
    assigned_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Project Template Assignment'
        verbose_name_plural = 'Project Template Assignments'

    def __str__(self):
        return f"{self.project.title} -> {self.template.name} v{self.template_version.version_number}"


class FormattingValidation(models.Model):
    """
    Comprehensive compliance audit result validating a project against a template version.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='formatting_validations'
    )
    template_version = models.ForeignKey(
        TemplateVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validations'
    )
    overall_status = models.CharField(
        max_length=30,
        choices=[
            ('COMPLIANT', 'Compliant'),
            ('NON_COMPLIANT', 'Non-Compliant'),
            ('PARTIALLY_VERIFIED', 'Partially Verified')
        ],
        default='NON_COMPLIANT'
    )
    total_issues = models.PositiveIntegerField(default=0)
    critical_count = models.PositiveIntegerField(default=0)
    major_count = models.PositiveIntegerField(default=0)
    minor_count = models.PositiveIntegerField(default=0)
    info_count = models.PositiveIntegerField(default=0)
    summary = models.JSONField(default=dict, blank=True)
    validated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Formatting Validation'
        verbose_name_plural = 'Formatting Validations'
        ordering = ['-validated_at']

    def __str__(self):
        return f"Validation {self.overall_status} for {self.project.title} ({self.total_issues} issues)"


class IssueSeverity(models.TextChoices):
    CRITICAL = 'CRITICAL', 'Critical Issue'
    MAJOR = 'MAJOR', 'Major Issue'
    MINOR = 'MINOR', 'Minor Issue'
    INFORMATIONAL = 'INFORMATIONAL', 'Informational Notice'


class RuleCategory(models.TextChoices):
    PAGE_SETTINGS = 'PAGE_SETTINGS', 'Page Settings'
    TYPOGRAPHY = 'TYPOGRAPHY', 'Typography & Spacing'
    CHAPTER_STRUCTURE = 'CHAPTER_STRUCTURE', 'Chapter & Headings'
    PAGINATION = 'PAGINATION', 'Pagination & Numbering'
    PRELIMINARY_PAGES = 'PRELIMINARY_PAGES', 'Preliminary Pages'
    TABLES_FIGURES = 'TABLES_FIGURES', 'Tables & Figures'
    CITATIONS = 'CITATIONS', 'Citations & References'
    WORD_LIMITS = 'WORD_LIMITS', 'Word Limits'
    METADATA = 'METADATA', 'Author & Publication Metadata'


class FormattingIssue(models.Model):
    """
    Individual non-compliance finding identified during formatting audit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    validation = models.ForeignKey(
        FormattingValidation,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    rule_key = models.CharField(max_length=100)
    rule_category = models.CharField(max_length=30, choices=RuleCategory.choices)
    severity = models.CharField(max_length=20, choices=IssueSeverity.choices)
    current_value = models.TextField(blank=True)
    expected_value = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    suggested_fix = models.TextField(blank=True)
    fix_available = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Formatting Issue'
        verbose_name_plural = 'Formatting Issues'
        ordering = ['-severity', 'created_at']

    def __str__(self):
        return f"[{self.severity}] {self.rule_category}: {self.rule_key}"


class FormattingChange(models.Model):
    """
    Audit log of safe formatting actions applied to document sections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='formatting_changes'
    )
    section = models.ForeignKey(
        'documents.DocumentSection',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='formatting_changes'
    )
    change_type = models.CharField(max_length=100)
    before_state = models.JSONField(default=dict)
    after_state = models.JSONField(default=dict)
    snapshot_version = models.ForeignKey(
        'documents.DocumentVersion',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='formatting_changes'
    )
    applied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='applied_formatting_changes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Formatting Change'
        verbose_name_plural = 'Formatting Changes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.change_type} on {self.project.title} at {self.created_at}"


# =====================================================================
# STAGE 8: Professional Document Export, Layout Verification & QA Models
# =====================================================================

class DocumentExportFormat(models.TextChoices):
    DOCX = 'DOCX', 'Microsoft Word (.docx)'
    PDF = 'PDF', 'Portable Document Format (.pdf)'


class ExportJobStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    VALIDATING = 'VALIDATING', 'Validating'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'


class ExportOverallRating(models.TextChoices):
    EXCELLENT = 'EXCELLENT', 'Excellent'
    ACCEPTABLE = 'ACCEPTABLE', 'Acceptable'
    NEEDS_ATTENTION = 'NEEDS_ATTENTION', 'Needs Attention'
    FAILED = 'FAILED', 'Failed'


class ExportIssueCategory(models.TextChoices):
    STRUCTURE = 'STRUCTURE', 'Structure & Headings'
    LAYOUT = 'LAYOUT', 'Layout & Pagination'
    CONTENT = 'CONTENT', 'Content & Captions'
    INTEGRITY = 'INTEGRITY', 'File & Format Integrity'


class ExportIssueSeverity(models.TextChoices):
    CRITICAL = 'CRITICAL', 'Critical'
    MAJOR = 'MAJOR', 'Major'
    MINOR = 'MINOR', 'Minor'
    INFORMATIONAL = 'INFORMATIONAL', 'Informational'
    NOT_VERIFIED = 'NOT_VERIFIED', 'Not Verified'


class DocumentExport(models.Model):
    """
    Exported academic document artifact (Microsoft Word DOCX or PDF).
    Preserves generation metadata, verified checksums, and structural element counts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='document_exports'
    )
    document_version = models.ForeignKey(
        'documents.DocumentVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exports'
    )
    export_format = models.CharField(
        max_length=10,
        choices=DocumentExportFormat.choices,
        default=DocumentExportFormat.DOCX
    )
    template_version = models.ForeignKey(
        TemplateVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exports'
    )
    citation_style = models.CharField(max_length=50, default='apa-7th')
    file_artifact = models.FileField(upload_to='exports/artifacts/%Y/%m/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_checksum = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash of the generated file")
    file_size_bytes = models.PositiveIntegerField(default=0)
    page_count = models.PositiveIntegerField(default=0)
    heading_count = models.PositiveIntegerField(default=0)
    table_count = models.PositiveIntegerField(default=0)
    figure_count = models.PositiveIntegerField(default=0)
    reference_count = models.PositiveIntegerField(default=0)
    word_count = models.PositiveIntegerField(default=0)
    metadata_snapshot = models.JSONField(default=dict, blank=True)
    is_verified = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_exports'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Document Export'
        verbose_name_plural = 'Document Exports'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.title} - {self.export_format} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"


class ExportJob(models.Model):
    """
    Asynchronous document generation job tracker with progress and idempotency support.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='export_jobs'
    )
    export_format = models.CharField(
        max_length=10,
        choices=DocumentExportFormat.choices,
        default=DocumentExportFormat.DOCX
    )
    template = models.ForeignKey(
        FormattingTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='export_jobs'
    )
    status = models.CharField(
        max_length=20,
        choices=ExportJobStatus.choices,
        default=ExportJobStatus.PENDING
    )
    progress_pct = models.PositiveIntegerField(default=0)
    status_message = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=128, blank=True, db_index=True)
    document_export = models.ForeignKey(
        DocumentExport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs'
    )
    export_options = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='export_jobs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Export Job'
        verbose_name_plural = 'Export Jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"ExportJob {self.id} [{self.status}] ({self.export_format})"


class ExportValidation(models.Model):
    """
    Automated Quality Assurance inspection report for an exported document.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_export = models.OneToOneField(
        DocumentExport,
        on_delete=models.CASCADE,
        related_name='validation_report'
    )
    structure_valid = models.BooleanField(default=True)
    layout_valid = models.BooleanField(default=True)
    citations_valid = models.BooleanField(default=True)
    total_issues = models.PositiveIntegerField(default=0)
    overall_rating = models.CharField(
        max_length=20,
        choices=ExportOverallRating.choices,
        default=ExportOverallRating.EXCELLENT
    )
    summary_notes = models.TextField(blank=True)
    cross_check_diffs = models.JSONField(default=dict, blank=True)
    metrics = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Export Validation'
        verbose_name_plural = 'Export Validations'
        ordering = ['-created_at']

    def __str__(self):
        return f"ExportValidation for {self.document_export_id} [{self.overall_rating}]"


class ExportIssue(models.Model):
    """
    Granular rendering defect or layout warning detected during QA verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    validation = models.ForeignKey(
        ExportValidation,
        on_delete=models.CASCADE,
        related_name='issues'
    )
    category = models.CharField(max_length=30, choices=ExportIssueCategory.choices)
    severity = models.CharField(max_length=20, choices=ExportIssueSeverity.choices)
    message = models.TextField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    suggested_action = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Export Issue'
        verbose_name_plural = 'Export Issues'
        ordering = ['-severity', 'created_at']

    def __str__(self):
        return f"[{self.severity}] {self.category}: {self.message[:60]}"


class RenderedAsset(models.Model):
    """
    Rendered page previews or embedded visual artifacts for document inspection.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_export = models.ForeignKey(
        DocumentExport,
        on_delete=models.CASCADE,
        related_name='rendered_assets'
    )
    page_number = models.PositiveIntegerField(default=1)
    asset_type = models.CharField(max_length=30, default='PAGE_THUMBNAIL')
    image_file = models.FileField(upload_to='exports/rendered/%Y/%m/', null=True, blank=True)
    image_data_uri = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Rendered Asset'
        verbose_name_plural = 'Rendered Assets'
        ordering = ['document_export', 'page_number']

    def __str__(self):
        return f"Asset {self.asset_type} p.{self.page_number} ({self.document_export_id})"
