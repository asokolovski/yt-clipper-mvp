# Kubernetes configuration

- `app/base` contains the application resources shared by every environment.
- `app/overlays/production` selects the production Artifact Registry images and tags.
- `infrastructure/yt-clipper` contains the application namespace, Postgres, and persistent clip storage.
- `infrastructure/temporal` contains the Temporal namespace and Postgres resources. `values.yaml` remains input to the Temporal Helm chart and is intentionally not listed as a Kustomize resource.

Render the production application without changing the cluster:

```bash
kubectl kustomize k8s/app/overlays/production
```

Render the infrastructure groups:

```bash
kubectl kustomize k8s/infrastructure/yt-clipper
kubectl kustomize k8s/infrastructure/temporal
```

Argo CD should watch `k8s/app/overlays/production`. Long-lived infrastructure can be managed separately.

`cloudbuild.yaml` stays at the repository root because it configures image builds rather than Kubernetes resources.
