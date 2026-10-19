# The backup container: Node to run container/*.ts, and Postgres 18, both the
# client tools (pg_dump, pg_restore, psql) and the server, for the scratch
# copy each backup is restored into. Postgres's own apt repository, so the
# version matches the live database.
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates postgresql-common \
  && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
  && sed -i "s/^#\?create_main_cluster.*/create_main_cluster = false/" /etc/postgresql-common/createcluster.conf \
  && apt-get install -y --no-install-recommends postgresql-18 \
  && rm -rf /var/lib/apt/lists/*

ENV PATH=/usr/lib/postgresql/18/bin:$PATH

WORKDIR /app
RUN echo '{"type": "module"}' > package.json
COPY container/backup.ts container/server.ts container/main.ts container/restore-sequences.sql ./

# Postgres won't run as root.
USER node
EXPOSE 8080
CMD ["node", "main.ts"]
