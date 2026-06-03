import { Topbar } from "@/components/topbar";
import { ClientForm } from "../client-form";

export default function NewClientPage() {
  return (
    <>
      <Topbar title="New client" subtitle="Add a person or company." />
      <div className="p-8">
        <ClientForm />
      </div>
    </>
  );
}
