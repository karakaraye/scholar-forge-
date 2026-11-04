from django.contrib import admin
from documents.models import ResearchDocument, DocumentSection, DocumentVersion


class DocumentSectionInline(admin.TabularInline):
    model = DocumentSection
    extra = 1
    fields = ('order_index', 'title', 'section_type', 'word_count')


@admin.register(ResearchDocument)
class ResearchDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'document_type', 'current_version_number', 'updated_at')
    inlines = [DocumentSectionInline]


@admin.register(DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    list_display = ('document', 'version_number', 'created_by', 'created_at')
