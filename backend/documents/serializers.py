from rest_framework import serializers
from documents.models import ResearchDocument, DocumentSection, DocumentVersion


class DocumentSectionSimpleSerializer(serializers.ModelSerializer):
    """
    Flat representation of a section/subsection.
    """
    class Meta:
        model = DocumentSection
        fields = [
            'id',
            'document_id',
            'parent_section_id',
            'title',
            'order_index',
            'section_type',
            'content',
            'word_count',
            'created_at',
            'updated_at',
        ]


class DocumentSectionSerializer(serializers.ModelSerializer):
    """
    Recursive or hierarchical document section serializer.
    """
    subsections = DocumentSectionSimpleSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentSection
        fields = [
            'id',
            'document_id',
            'parent_section',
            'parent_section_id',
            'title',
            'order_index',
            'section_type',
            'content',
            'word_count',
            'subsections',
            'created_at',
            'updated_at',
        ]


class DocumentSectionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSection
        fields = [
            'id',
            'title',
            'order_index',
            'section_type',
            'content',
            'parent_section',
        ]
        read_only_fields = ['id']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Section title cannot be empty.")
        return value.strip()


class SectionReorderItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    order_index = serializers.IntegerField(min_value=0)
    parent_section_id = serializers.UUIDField(required=False, allow_null=True)


class SectionReorderListSerializer(serializers.Serializer):
    sections = SectionReorderItemSerializer(many=True)


class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            'id',
            'document_id',
            'version_number',
            'snapshot_data',
            'created_by',
            'created_by_name',
            'change_summary',
            'created_at',
        ]
        read_only_fields = ['id', 'version_number', 'snapshot_data', 'created_by', 'created_at']


class DocumentVersionCreateSerializer(serializers.Serializer):
    change_summary = serializers.CharField(required=False, allow_blank=True, default="Manual snapshot")


class ResearchDocumentDetailSerializer(serializers.ModelSerializer):
    sections = DocumentSectionSerializer(many=True, read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = ResearchDocument
        fields = [
            'id',
            'project',
            'project_title',
            'title',
            'document_type',
            'current_version_number',
            'sections',
            'created_at',
            'updated_at',
        ]

