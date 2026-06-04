import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./ui/AppShell";
import { HomePage } from "./pages/HomePage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ContactsPage } from "./pages/ContactsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "applications", element: <ApplicationsPage /> },
      { path: "contacts", element: <ContactsPage /> }
    ]
  }
]);

export function App() {
  return <RouterProvider router={router} />;
}
