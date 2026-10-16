from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "status": "online",
        "service": "TypBox Hub API",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/",
            "categories": "/api/categories/",
            "logs": "/api/logs/",
            "telemetry": "/api/hub/telemetry/",
        }
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/', include('tracker.urls')),
]
