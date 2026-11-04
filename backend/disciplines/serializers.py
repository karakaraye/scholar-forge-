from rest_framework import serializers
from disciplines.models import AcademicDiscipline


class AcademicDisciplineSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicDiscipline
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
