import uuid
from django.db import models
from django.utils.text import slugify


class AcademicDiscipline(models.Model):
    """
    Multidisciplinary academic discipline entity.
    Pre-seeded with initial disciplines across STEM, Social Sciences,
    Health, Law, Business, and Humanities, extensible by administrators.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    slug = models.SlugField(max_length=120, unique=True)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Academic Discipline'
        verbose_name_plural = 'Academic Disciplines'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
