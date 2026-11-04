from django.contrib import admin
from workspaces.models import Workspace, WorkspaceMembership, AuditEvent


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'is_personal', 'created_at')
    search_fields = ('name', 'owner__email')


@admin.register(WorkspaceMembership)
class WorkspaceMembershipAdmin(admin.ModelAdmin):
    list_display = ('workspace', 'user', 'role', 'created_at')
    list_filter = ('role',)


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ('action', 'entity_type', 'user', 'workspace', 'created_at')
    list_filter = ('action', 'entity_type')
    readonly_fields = ('id', 'action', 'entity_type', 'entity_id', 'details', 'ip_address', 'created_at')
