from django.contrib import admin
from disciplines.models import AcademicDiscipline


@admin.register(AcademicDiscipline)
class AcademicDisciplineAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'slug', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'category', 'description')
    prepopulated_fields = {'slug': ('name',)}
