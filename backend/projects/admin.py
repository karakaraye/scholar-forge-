from django.contrib import admin
from projects.models import ResearchProject, ResearchRequirements


class ResearchRequirementsInline(admin.StackedInline):
    model = ResearchRequirements
    can_delete = False


@admin.register(ResearchProject)
class ResearchProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_category', 'discipline', 'academic_level', 'status', 'owner', 'updated_at')
    list_filter = ('document_category', 'status', 'academic_level', 'discipline')
    search_fields = ('title', 'document_subtype', 'institution', 'owner__email')
    inlines = [ResearchRequirementsInline]
