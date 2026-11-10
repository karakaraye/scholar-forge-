import uuid
from django.db import models
from django.conf import settings


class ResearchDocument(models.Model):
    """
    Main manuscript or associated document within a research project.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.ResearchProject',
        on_delete=models.CASCADE,
        related_name='documents'
    )
    title = models.CharField(max_length=500)
    document_type = models.CharField(max_length=100, default='MAIN_MANUSCRIPT')
    current_version_number = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Research Document'
        verbose_name_plural = 'Research Documents'
        ordering = ['-updated_at']

    @property
    def order(self):
        return self.order_index

    @property
    def content(self):
        sections = self.sections.all().order_by('order_index')
        return "\n\n".join([s.content for s in sections if s.content])

    def __str__(self):
        return f"{self.title} (v{self.current_version_number})"


class DocumentSection(models.Model):
    """
    Modular chapter or section in a document.
    Supports dynamic outline structures across disciplines without hardcoding 5 chapters.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        ResearchDocument,
        on_delete=models.CASCADE,
        related_name='sections'
    )
    parent_section = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subsections'
    )
    title = models.CharField(max_length=255)
    order_index = models.PositiveIntegerField(default=0)
    section_type = models.CharField(
        max_length=100,
        default='SECTION',
        help_text='e.g., CHAPTER, INTRODUCTION, LITERATURE_REVIEW, METHODOLOGY, RESULTS, DISCUSSION, CONCLUSION'
    )
    content = models.TextField(blank=True)
    word_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Document Section'
        verbose_name_plural = 'Document Sections'
        ordering = ['order_index', 'created_at']

    def save(self, *args, **kwargs):
        if self.content:
            self.word_count = len(self.content.split())
        else:
            self.word_count = 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_index + 1}. {self.title}"

    @property
    def content_html(self):
        return self.content or ""

    @property
    def content_json(self):
        return {
            "html": self.content or "",
            "text": self.content or ""
        }


class DocumentVersion(models.Model):
    """
    Immutable version snapshot of an academic document for revision tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        ResearchDocument,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    snapshot_data = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_versions'
    )
    change_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Document Version'
        verbose_name_plural = 'Document Versions'
        ordering = ['-version_number']
        constraints = [
            models.UniqueConstraint(
                fields=['document', 'version_number'],
                name='unique_document_version_number'
            )
        ]

    def __str__(self):
        return f"{self.document.title} - Version {self.version_number}"
