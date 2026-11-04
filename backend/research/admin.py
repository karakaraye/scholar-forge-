from django.contrib import admin
from research.models import ResearchSource, ProjectSource, Citation, AIJob


@admin.register(ResearchSource)
class ResearchSourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'source_type', 'publication_year', 'created_at')
    list_filter = ('source_type', 'publication_year')
    search_fields = ('title', 'doi', 'abstract')


@admin.register(ProjectSource)
class ProjectSourceAdmin(admin.ModelAdmin):
    list_display = ('project', 'source', 'relevance_score', 'is_annotated')


@admin.register(Citation)
class CitationAdmin(admin.ModelAdmin):
    list_display = ('project', 'source', 'citation_style', 'in_text_format')
    list_filter = ('citation_style',)


@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    list_display = ('job_type', 'project', 'user', 'status', 'created_at')
    list_filter = ('job_type', 'status')
