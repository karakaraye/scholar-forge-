import uuid
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import status, views, permissions
from rest_framework.response import Response

from documents.models import ResearchDocument, DocumentSection, DocumentVersion
from documents.serializers import (
    DocumentSectionSerializer,
    DocumentSectionSimpleSerializer,
    DocumentSectionCreateUpdateSerializer,
    SectionReorderListSerializer,
    DocumentVersionSerializer,
    DocumentVersionCreateSerializer,
    ResearchDocumentDetailSerializer,
)
from documents.permissions import (
    IsDocumentOwnerOrWorkspaceMember,
    IsSectionOwnerOrWorkspaceMember,
)
from documents.structure_engine import (
    list_available_templates,
    generate_document_outline,
)
from workspaces.models import WorkspaceMembership


class AcademicTemplatesListView(views.APIView):
    """
    Returns available academic manuscript outline templates across disciplines.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        templates = list_available_templates()
        return Response(templates, status=status.HTTP_200_OK)


class DocumentDetailView(views.APIView):
    """
    Retrieves full details of a research document with all sections.
    """
    permission_classes = [permissions.IsAuthenticated, IsDocumentOwnerOrWorkspaceMember]

    def get(self, request, pk):
        document = get_object_or_404(ResearchDocument, pk=pk)
        self.check_object_permissions(request, document)
        serializer = ResearchDocumentDetailSerializer(document)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentSectionsListView(views.APIView):
    """
    List sections of a document or create a new section/subsection.
    """
    permission_classes = [permissions.IsAuthenticated, IsDocumentOwnerOrWorkspaceMember]

    def get(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        # Top-level sections with their nested subsections
        sections = document.sections.filter(parent_section__isnull=True).order_index_ordered() if hasattr(document.sections, 'order_index_ordered') else document.sections.filter(parent_section__isnull=True).order_by('order_index', 'created_at')
        serializer = DocumentSectionSerializer(sections, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        serializer = DocumentSectionCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            # Determine order_index if not provided
            order = serializer.validated_data.get('order_index')
            if order is None:
                max_order = document.sections.all().count()
                order = max_order

            section = serializer.save(document=document, order_index=order)
            document.save()  # update document timestamp
            return Response(DocumentSectionSerializer(section).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentSectionDetailView(views.APIView):
    """
    Retrieve, update (autosave/manual save), or delete a specific section.
    """
    permission_classes = [permissions.IsAuthenticated, IsSectionOwnerOrWorkspaceMember]

    def get(self, request, pk):
        section = get_object_or_404(DocumentSection, pk=pk)
        self.check_object_permissions(request, section)
        serializer = DocumentSectionSerializer(section)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        section = get_object_or_404(DocumentSection, pk=pk)
        self.check_object_permissions(request, section)

        serializer = DocumentSectionCreateUpdateSerializer(section, data=request.data, partial=True)
        if serializer.is_valid():
            updated_section = serializer.save()
            updated_section.document.save()  # touch document updated_at
            return Response(DocumentSectionSerializer(updated_section).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        section = get_object_or_404(DocumentSection, pk=pk)
        self.check_object_permissions(request, section)

        doc = section.document
        section.delete()
        doc.save()
        return Response({"detail": "Section deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class DocumentSectionsReorderView(views.APIView):
    """
    Bulk update section order indices and parent assignments.
    """
    permission_classes = [permissions.IsAuthenticated, IsDocumentOwnerOrWorkspaceMember]

    def post(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        serializer = SectionReorderListSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        sections_data = serializer.validated_data['sections']

        with transaction.atomic():
            for item in sections_data:
                sec_id = item['id']
                new_order = item['order_index']
                parent_id = item.get('parent_section_id')

                parent = None
                if parent_id:
                    parent = DocumentSection.objects.filter(id=parent_id, document=document).first()

                DocumentSection.objects.filter(id=sec_id, document=document).update(
                    order_index=new_order,
                    parent_section=parent
                )

            document.save()

        # Return updated ordered list
        sections = document.sections.all().order_by('order_index', 'created_at')
        return Response(DocumentSectionSimpleSerializer(sections, many=True).data, status=status.HTTP_200_OK)


class DocumentVersionsListView(views.APIView):
    """
    List version history snapshots or take a new manual version snapshot.
    """
    permission_classes = [permissions.IsAuthenticated, IsDocumentOwnerOrWorkspaceMember]

    def get(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        versions = document.versions.all().order_by('-version_number')
        serializer = DocumentVersionSerializer(versions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        serializer = DocumentVersionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        change_summary = serializer.validated_data.get('change_summary', 'Manual snapshot')

        # Serialize current sections snapshot
        sections = document.sections.all().order_by('order_index')
        sections_data = [
            {
                "id": str(s.id),
                "parent_section_id": str(s.parent_section_id) if s.parent_section_id else None,
                "title": s.title,
                "section_type": s.section_type,
                "order_index": s.order_index,
                "content": s.content,
                "word_count": s.word_count
            }
            for s in sections
        ]

        with transaction.atomic():
            next_version = document.current_version_number + 1
            version = DocumentVersion.objects.create(
                document=document,
                version_number=next_version,
                snapshot_data={
                    "document_title": document.title,
                    "version_number": next_version,
                    "sections": sections_data
                },
                created_by=request.user,
                change_summary=change_summary
            )
            document.current_version_number = next_version
            document.save()

        return Response(DocumentVersionSerializer(version).data, status=status.HTTP_201_CREATED)


class DocumentVersionRestoreView(views.APIView):
    """
    Restores a previous version snapshot.
    Creates a new revision rather than deleting history.
    """
    permission_classes = [permissions.IsAuthenticated, IsDocumentOwnerOrWorkspaceMember]

    def post(self, request, document_id, version_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        target_version = get_object_or_404(DocumentVersion, pk=version_id, document=document)
        snapshot = target_version.snapshot_data or {}
        saved_sections = snapshot.get("sections", [])

        if not saved_sections:
            return Response(
                {"error": "Target version has no recorded sections to restore."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 1. Take a safety snapshot of the current state before restoring
            current_sections = document.sections.all().order_by('order_index')
            current_sections_data = [
                {
                    "id": str(s.id),
                    "parent_section_id": str(s.parent_section_id) if s.parent_section_id else None,
                    "title": s.title,
                    "section_type": s.section_type,
                    "order_index": s.order_index,
                    "content": s.content,
                    "word_count": s.word_count
                }
                for s in current_sections
            ]
            safety_version_number = document.current_version_number + 1
            DocumentVersion.objects.create(
                document=document,
                version_number=safety_version_number,
                snapshot_data={
                    "document_title": document.title,
                    "version_number": safety_version_number,
                    "sections": current_sections_data
                },
                created_by=request.user,
                change_summary=f"Automated checkpoint prior to restoring version {target_version.version_number}"
            )

            # 2. Increment version number for the restored state
            restored_version_number = safety_version_number + 1
            document.current_version_number = restored_version_number

            # 3. Clear existing sections and reconstruct from snapshot
            document.sections.all().delete()

            id_map = {}  # maps old snapshot id to newly created section

            # First pass: Create parent sections
            for sec_data in saved_sections:
                if not sec_data.get("parent_section_id"):
                    content = sec_data.get("content", "")
                    created = DocumentSection.objects.create(
                        document=document,
                        title=sec_data.get("title", "Untitled Section"),
                        section_type=sec_data.get("section_type", "SECTION"),
                        order_index=sec_data.get("order_index", 0),
                        content=content,
                        word_count=len(content.split()) if content else 0
                    )
                    id_map[str(sec_data.get("id"))] = created

            # Second pass: Create subsections
            for sec_data in saved_sections:
                parent_id = sec_data.get("parent_section_id")
                if parent_id:
                    parent_instance = id_map.get(str(parent_id))
                    content = sec_data.get("content", "")
                    created = DocumentSection.objects.create(
                        document=document,
                        parent_section=parent_instance,
                        title=sec_data.get("title", "Untitled Subsection"),
                        section_type=sec_data.get("section_type", "SUBSECTION"),
                        order_index=sec_data.get("order_index", 0),
                        content=content,
                        word_count=len(content.split()) if content else 0
                    )
                    id_map[str(sec_data.get("id"))] = created

            # 4. Record new version snapshot representing the restored state
            DocumentVersion.objects.create(
                document=document,
                version_number=restored_version_number,
                snapshot_data=snapshot,
                created_by=request.user,
                change_summary=f"Restored from version {target_version.version_number}"
            )
            document.save()

        # Return refreshed document
        document.refresh_from_db()
        return Response(
            {
                "message": f"Successfully restored version {target_version.version_number} as version {restored_version_number}",
                "document": ResearchDocumentDetailSerializer(document).data
            },
            status=status.HTTP_200_OK
        )


class ApplyStructureTemplateView(views.APIView):
    """
    Applies an academic structure template to a document, preserving existing content.
    """
    permission_classes = [permissions.IsAuthenticated, IsDocumentOwnerOrWorkspaceMember]

    def post(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document)

        project = document.project
        discipline_name = request.data.get("discipline_name") or (project.discipline.name if project.discipline else "")
        category = request.data.get("document_category") or project.document_category
        subtype = request.data.get("document_subtype") or project.document_subtype
        preserve = request.data.get("preserve_content", True)

        new_sections = generate_document_outline(
            document=document,
            discipline_name=discipline_name,
            category=category,
            subtype=subtype,
            academic_level=project.academic_level,
            preserve_existing_content=preserve
        )

        document.save()
        document.refresh_from_db()
        return Response(
            {
                "message": f"Applied structure outline for {discipline_name} ({category})",
                "document": ResearchDocumentDetailSerializer(document).data
            },
            status=status.HTTP_200_OK
        )
