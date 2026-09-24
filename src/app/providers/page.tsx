import { prisma } from "@/lib/prisma";
import {
  deleteServiceCategory,
  deleteServiceCompany,
  deleteServiceContact,
} from "@/app/actions";
import { isViewer } from "@/lib/role";
import { AddCategoryForm } from "./AddCategoryForm";
import { AddCompanyForm } from "./AddCompanyForm";
import { AddContactForm } from "./AddContactForm";

export default async function ProvidersPage() {
  const [categories, viewer] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        companies: {
          orderBy: { order: "asc" },
          include: { contacts: { orderBy: { name: "asc" } } },
        },
      },
    }),
    isViewer(),
  ]);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">נותני שירות</h1>
      <p className="text-sm text-slate-500">
        ספקי שירות ואנשי קשר לפי תחום (מזגנים, חדרי קירור, מעליות ועוד).
      </p>

      {!viewer && <AddCategoryForm />}

      <div className="space-y-4">
        {categories.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
            אין תחומים רשומים
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{category.name}</h2>
                {!viewer && (
                  <form action={deleteServiceCategory.bind(null, category.id)}>
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      מחיקת תחום
                    </button>
                  </form>
                )}
              </div>

              <div className="space-y-3">
                {category.companies.map((company) => (
                  <div
                    key={company.id}
                    className="rounded-md border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">{company.name}</h3>
                      {!viewer && (
                        <form
                          action={deleteServiceCompany.bind(null, company.id)}
                        >
                          <button
                            type="submit"
                            className="rounded-md border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                          >
                            מחיקה
                          </button>
                        </form>
                      )}
                    </div>

                    {company.contacts.length === 0 ? (
                      <p className="text-sm text-slate-400">אין אנשי קשר עדיין</p>
                    ) : (
                      <ul className="mb-2 space-y-1">
                        {company.contacts.map((contact) => (
                          <li
                            key={contact.id}
                            className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm"
                          >
                            <span>
                              {contact.name}
                              {contact.role ? ` (${contact.role})` : ""}
                              {contact.phone ? (
                                <>
                                  {" · "}
                                  <a
                                    href={`tel:${contact.phone}`}
                                    dir="ltr"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {contact.phone}
                                  </a>
                                </>
                              ) : null}
                            </span>
                            {!viewer && (
                              <form
                                action={deleteServiceContact.bind(
                                  null,
                                  contact.id,
                                )}
                              >
                                <button
                                  type="submit"
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  מחיקה
                                </button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {!viewer && <AddContactForm companyId={company.id} />}
                  </div>
                ))}
              </div>

              {!viewer && (
                <div className="mt-3">
                  <AddCompanyForm categoryId={category.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
