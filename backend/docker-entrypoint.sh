#!/bin/sh
set -e
# Bring the schema up to date before the API starts serving
alembic upgrade head
exec "$@"
