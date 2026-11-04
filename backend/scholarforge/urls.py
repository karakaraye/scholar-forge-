from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'ScholarForge AI API',
        'version': '1.0.0',
        'stage': 'Stage 1 - SaaS Foundation'
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check, name='api-health'),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/disciplines/', include('disciplines.urls')),
    path('api/v1/projects/', include('projects.urls')),
    path('api/v1/workspaces/', include('workspaces.urls')),
]
