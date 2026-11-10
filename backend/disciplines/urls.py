from django.urls import path
from disciplines.views import AcademicDisciplineListView, AcademicDisciplineDetailView

urlpatterns = [
    path('', AcademicDisciplineListView.as_view(), name='discipline-list'),
    path('<uuid:id>/', AcademicDisciplineDetailView.as_view(), name='discipline-detail'),
]

