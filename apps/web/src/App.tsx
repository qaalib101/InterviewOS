import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ContactsPage } from "./pages/ContactsPage";
import { InterviewsPage } from "./pages/InterviewsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "applications", element: <ApplicationsPage /> },
      { path: "contacts", element: <ContactsPage /> },
      { path: "interviews", element: <InterviewsPage /> },
      { path: "follow-ups", element: <FollowUpsPage /> }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
