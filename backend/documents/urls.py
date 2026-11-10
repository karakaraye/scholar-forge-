from django.urls import path
from documents.views import (
    AcademicTemplatesListView,
    DocumentDetailView,
    DocumentSectionsListView,
    DocumentSectionDetailView,
    DocumentSectionsReorderView,
    DocumentVersionsListView,
    DocumentVersionRestoreView,
    ApplyStructureTemplateView,
)

urlpatterns = [
    path('templates/', AcademicTemplatesListView.as_view(), name='academic-templates-list'),
    path('<uuid:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('<uuid:document_id>/sections/', DocumentSectionsListView.as_view(), name='document-sections-list'),
    path('sections/<uuid:pk>/', DocumentSectionDetailView.as_view(), name='document-section-detail'),
    path('<uuid:document_id>/sections/reorder/', DocumentSectionsReorderView.as_view(), name='document-sections-reorder'),
    path('<uuid:document_id>/versions/', DocumentVersionsListView.as_view(), name='document-versions-list'),
    path('<uuid:document_id>/versions/<uuid:version_id>/restore/', DocumentVersionRestoreView.as_view(), name='document-version-restore'),
    path('<uuid:document_id>/apply-template/', ApplyStructureTemplateView.as_view(), name='document-apply-template'),
]

