"""
Seed Data Script for TypBox
Populates large-scale study logs and categories for performance testing and telemetry visualization.

Usage:
  python seed_data.py --username rikutomikado --count 500
  python seed_data.py --username rikutomikado --clear
"""

import argparse
import os
import random
import sys
from datetime import datetime, timedelta

import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "typbox_hub.settings")
django.setup()

from django.contrib.auth import get_user_model
from tracker.models import Category, StudyLog

User = get_user_model()

SAMPLE_TOPICS = [
    # Full-stack Development (DEV)
    "React 19 Server Components and actions deep dive",
    "Django REST Framework serialization and query optimization",
    "PostgreSQL indexing strategies and EXPLAIN ANALYZE tuning",
    "Tailwind CSS v4 arbitrary value optimization and JIT engine",
    "JWT authentication refresh rotation and secure token storage",
    "TypeScript strict type narrowing and discriminating unions",
    "Zstandard compression algorithms and HTTP caching headers",
    "Vite bundling chunk splitting and Rollup tree shaking",
    "WebSockets telemetry data streaming architecture",
    "Next.js 15 App Router caching semantics and revalidation",
    # Network & Infrastructure (NET)
    "BGP routing table optimization and route reflector design",
    "WireGuard VPN mesh network architecture and MTU tuning",
    "Docker multi-stage build optimization and layer caching",
    "Kubernetes pod affinity, ingress controllers and TLS cert-manager",
    "Linux kernel eBPF network packet tracing and security monitoring",
    "Terraform module refactoring for multi-region cloud infrastructure",
    "AWS VPC peering, transit gateways and route table policies",
    "Nginx reverse proxy keep-alive connection tuning",
    "Cloudflare DNSSEC and edge worker reverse routing",
    # English & Academic Writing (LANG)
    "Technical documentation writing: RFC structure and proposal patterns",
    "Academic essay structure: persuasive argumentation and evidence synthesis",
    "IELTS reading section timed practice and vocabulary drill",
    "Engineering whitepaper drafting: distributed systems telemetry",
    "Audio comprehension: ACM queue podcast on distributed consensus",
    "Grammar and style guide polishing: Strunk & White principles",
    # Systems & Architecture (SYS)
    "Distributed systems: Paxos and Raft consensus algorithms",
    "Linux cgroups v2 resource isolation and memory limit debugging",
    "Database ACID transactions and repeatable read isolation anomalies",
    "System design interview: Global metrics aggregator and rate limiter",
    "ARM64 assembly language fundamentals and register calling conventions",
]

DEFAULT_CATEGORIES_SPEC = [
    {
        "name": "Full-stack Development",
        "code": "DEV",
        "color": "#10b981",
        "weekly_target_hours": 9,
    },
    {
        "name": "Network & Infrastructure",
        "code": "NET",
        "color": "#f59e0b",
        "weekly_target_hours": 7,
    },
    {
        "name": "English / Academic Writing",
        "code": "LANG",
        "color": "#a855f7",
        "weekly_target_hours": 5,
    },
    {
        "name": "Systems & Architecture",
        "code": "SYS",
        "color": "#3b82f6",
        "weekly_target_hours": 8,
    },
]


def seed(username: str, count: int, days_span: int = 120):
    user = User.objects.filter(username=username).first()
    if not user:
        print(f"Error: User '{username}' does not exist in database.")
        sys.exit(1)

    print(f"[*] Found user: {user.username} (ID: {user.id})")

    # Ensure categories exist
    existing_cats = list(Category.objects.filter(user=user))
    existing_codes = {c.code for c in existing_cats}

    for spec in DEFAULT_CATEGORIES_SPEC:
        if spec["code"] not in existing_codes:
            cat = Category.objects.create(
                user=user,
                name=spec["name"],
                code=spec["code"],
                color=spec["color"],
                weekly_target_hours=spec["weekly_target_hours"],
            )
            existing_cats.append(cat)
            print(f"[+] Created category: [{cat.code}] {cat.name}")

    if not existing_cats:
        print("Error: No categories available.")
        sys.exit(1)

    print(f"[*] Available categories: {[c.code for c in existing_cats]}")
    print(
        f"[*] Generating {count} synthetic study logs across the past {days_span} days..."
    )

    now = datetime.now()
    new_logs = []

    for i in range(count):
        # Distribute logs across past days_span days
        # Weight recent days slightly higher
        days_ago = int(random.triangular(0, days_span, 0))
        log_date = (now - timedelta(days=days_ago)).date()

        cat = random.choice(existing_cats)
        duration = random.choice([25, 45, 60, 90, 120, 150, 180])
        topic = random.choice(SAMPLE_TOPICS)
        is_public = random.random() < 0.85  # 85% public

        new_logs.append(
            StudyLog(
                user=user,
                category=cat,
                date=log_date,
                duration_minutes=duration,
                topic=topic,
                is_public_to_hub=is_public,
            )
        )

    # Bulk insert for maximum performance
    created = StudyLog.objects.bulk_create(new_logs)
    total_minutes = sum(l.duration_minutes for l in created)
    total_hours = round(total_minutes / 60, 1)

    print(f"[✓] Successfully inserted {len(created)} study logs!")
    print(
        f"[*] Total injected study time: {total_hours} hours ({total_minutes} minutes)"
    )
    print(
        f"[*] Total user logs now in DB: {StudyLog.objects.filter(user=user).count()}"
    )


def clear(username: str):
    user = User.objects.filter(username=username).first()
    if not user:
        print(f"Error: User '{username}' does not exist.")
        sys.exit(1)

    deleted_count, _ = StudyLog.objects.filter(user=user).delete()
    print(
        f"[✓] Cleared {deleted_count} study logs for user '{username}'. Categories remain intact."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed synthetic study data for load testing"
    )
    parser.add_argument("--username", default="rikutomikado", help="Target username")
    parser.add_argument(
        "--count", type=int, default=500, help="Number of logs to generate"
    )
    parser.add_argument(
        "--days", type=int, default=120, help="Span of days in the past"
    )
    parser.add_argument("--clear", action="store_true", help="Clear all logs for user")

    args = parser.parse_args()

    if args.clear:
        clear(args.username)
    else:
        seed(args.username, args.count, args.days)
