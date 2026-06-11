import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ContactsPage } from "./pages/ContactsPage";
import { InterviewsPage } from "./pages/InterviewsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { ImportNewPage } from "./pages/ImportNewPage";
import { ToastProvider } from "./ui/Toast";

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
      { path: "follow-ups", element: <FollowUpsPage /> },
      { path: "imports/new", element: <ImportNewPage /> }
    ]
  }
]);

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
