from rest_framework import serializers
from projects.models import (
    ResearchProject,
    ResearchRequirements,
    DocumentCategory,
    CitationStyle,
    ProjectStatus,
)
from accounts.models import AcademicLevel
from disciplines.models import AcademicDiscipline
from disciplines.serializers import AcademicDisciplineSerializer
from workspaces.models import Workspace, WorkspaceMembership
from documents.models import ResearchDocument, DocumentSection
from documents.structure_engine import generate_document_outline


class ResearchRequirementsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchRequirements
        fields = [
            'id',
            'research_methodology',
            'research_objectives',
            'supervisor_requirements',
            'target_word_count',
            'deadline',
            'custom_parameters',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSection
        fields = [
            'id',
            'title',
            'order_index',
            'section_type',
            'content',
            'word_count',
            'parent_section',
            'created_at',
            'updated_at',
        ]


class ResearchDocumentSerializer(serializers.ModelSerializer):
    sections = DocumentSectionSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchDocument
        fields = [
            'id',
            'title',
            'document_type',
            'current_version_number',
            'sections',
            'created_at',
            'updated_at',
        ]


class ResearchProjectListSerializer(serializers.ModelSerializer):
    discipline_name = serializers.CharField(source='discipline.name', read_only=True)
    discipline_category = serializers.CharField(source='discipline.category', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta:
        model = ResearchProject
        fields = [
            'id',
            'title',
            'document_category',
            'document_subtype',
            'academic_level',
            'status',
            'discipline',
            'discipline_name',
            'discipline_category',
            'institution',
            'country',
            'preferred_language',
            'citation_style',
            'owner_name',
            'created_at',
            'updated_at',
        ]


class ResearchProjectDetailSerializer(serializers.ModelSerializer):
    discipline_details = AcademicDisciplineSerializer(source='discipline', read_only=True)
    requirements = ResearchRequirementsSerializer(read_only=True)
    documents = ResearchDocumentSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)

    class Meta:
        model = ResearchProject
        fields = [
            'id',
            'title',
            'document_category',
            'document_subtype',
            'academic_level',
            'status',
            'discipline',
            'discipline_details',
            'institution',
            'country',
            'preferred_language',
            'citation_style',
            'requirements',
            'documents',
            'owner_name',
            'workspace_name',
            'created_at',
            'updated_at',
        ]


class ResearchProjectCreateUpdateSerializer(serializers.ModelSerializer):
    requirements = ResearchRequirementsSerializer(required=False)
    discipline_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicDiscipline.objects.filter(is_active=True),
        source='discipline',
        write_only=True
    )

    class Meta:
        model = ResearchProject
        fields = [
            'id',
            'title',
            'document_category',
            'document_subtype',
            'academic_level',
            'status',
            'discipline_id',
            'institution',
            'country',
            'preferred_language',
            'citation_style',
            'requirements',
        ]
        read_only_fields = ['id', 'status']

    def validate_title(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("Project title must be at least 3 characters long.")
        return value.strip()

    def create(self, validated_data):
        user = self.context['request'].user
        requirements_data = validated_data.pop('requirements', {})

        # Find or create user's personal workspace
        workspace = Workspace.objects.filter(owner=user, is_personal=True).first()
        if not workspace:
            workspace = Workspace.objects.create(
                name=f"{user.get_short_name()}'s Workspace",
                owner=user,
                is_personal=True
            )
            WorkspaceMembership.objects.create(
                workspace=workspace,
                user=user,
                role='OWNER'
            )

        project = ResearchProject.objects.create(
            owner=user,
            workspace=workspace,
            status=ProjectStatus.ACTIVE,
            **validated_data
        )

        # Create requirements
        ResearchRequirements.objects.create(project=project, **requirements_data)

        # Create default main manuscript document
        document = ResearchDocument.objects.create(
            project=project,
            title=f"{project.title} - Main Manuscript",
            document_type="MAIN_MANUSCRIPT"
        )

        # Generate multidisciplinary dynamic outline sections via Academic Structure Engine
        discipline_name = project.discipline.name if project.discipline else ""
        generate_document_outline(
            document=document,
            discipline_name=discipline_name,
            category=project.document_category,
            subtype=project.document_subtype,
            academic_level=project.academic_level
        )

        return project

    def update(self, instance, validated_data):
        requirements_data = validated_data.pop('requirements', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if requirements_data is not None:
            requirements, _ = ResearchRequirements.objects.get_or_create(project=instance)
            for r_attr, r_val in requirements_data.items():
                setattr(requirements, r_attr, r_val)
            requirements.save()

        return instance

