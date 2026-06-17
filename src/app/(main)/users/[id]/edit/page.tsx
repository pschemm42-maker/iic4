import { notFound } from "next/navigation";
import { EditUserForm } from "@/components/users/edit-user-form";
import { requireAdministrator } from "@/lib/auth/session";
import { getUser } from "@/lib/users/actions";

type EditUserPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: EditUserPageProps) {
  await requireAdministrator();
  const { id } = await params;
  const result = await getUser(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10">
      <EditUserForm user={result.data} />
    </div>
  );
}
