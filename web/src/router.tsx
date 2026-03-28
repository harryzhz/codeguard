import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProjectList } from "./pages/ProjectList";
import { ReviewList } from "./pages/ReviewList";
import { ReviewDetail } from "./pages/ReviewDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/projects" replace />,
  },
  {
    path: "/projects",
    element: <ProjectList />,
  },
  {
    path: "/projects/:projectName/reviews",
    element: <ReviewList />,
  },
  {
    path: "/projects/:projectName/reviews/:version",
    element: <ReviewDetail />,
  },
]);
