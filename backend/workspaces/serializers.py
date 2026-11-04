from rest_framework import serializers
from workspaces.models import Workspace, WorkspaceMembership, AuditEvent


class WorkspaceSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    member_count = serializers.IntegerField(source='memberships.count', read_only=True)

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'slug',
            'owner_email',
            'description',
            'is_personal',
            'member_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
