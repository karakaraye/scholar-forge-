from rest_framework import generics, permissions, filters
from disciplines.models import AcademicDiscipline
from disciplines.serializers import AcademicDisciplineSerializer


class AcademicDisciplineListView(generics.ListCreateAPIView):
    """
    List all active academic disciplines or create new disciplines (admin only).
    """
    queryset = AcademicDiscipline.objects.filter(is_active=True).order_by('name')
    serializer_class = AcademicDisciplineSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        category = self.request.query_params.get('category', '').strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        if category:
            queryset = queryset.filter(category__iexact=category)
        return queryset


class AcademicDisciplineDetailView(generics.RetrieveUpdateAPIView):
    queryset = AcademicDiscipline.objects.all()
    serializer_class = AcademicDisciplineSerializer
    lookup_field = 'id'

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]
