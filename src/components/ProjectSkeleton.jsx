
import Skeleton from "./Skeleton";

export default function ProjectSkeleton() {
  return (
    <div className="project-grid" aria-label="Loading projects">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="project-card" key={index}>
          <Skeleton
            style={{
              width: "100%",
              height: "180px",
              marginBottom: "16px",
            }}
          />

          <Skeleton
            style={{
              width: "70%",
              height: "20px",
              marginBottom: "12px",
            }}
          />

          <Skeleton
            style={{
              width: "100%",
              height: "12px",
              marginBottom: "8px",
            }}
          />

          <Skeleton
            style={{
              width: "45%",
              height: "12px",
            }}
          />
        </div>
      ))}
    </div>
  );
}
