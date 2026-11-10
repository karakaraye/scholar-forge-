from django.urls import path
from projects.views import (
    ResearchProjectListCreateView,
    ResearchProjectDetailView,
    ResearchProjectArchiveView,
    DashboardStatsView,
)

urlpatterns = [
    path('', ResearchProjectListCreateView.as_view(), name='project-list-create'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='project-dashboard-stats'),
    path('<uuid:id>/', ResearchProjectDetailView.as_view(), name='project-detail'),
    path('<uuid:id>/archive/', ResearchProjectArchiveView.as_view(), name='project-archive'),
]

