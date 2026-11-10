from django.urls import path
from workspaces.views import CurrentWorkspaceView

urlpatterns = [
    path('current/', CurrentWorkspaceView.as_view(), name='workspace-current'),
]

