import { Ban, Building2, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, LoadingState } from "../../../shared/ui/page-state";
import { Modal } from "../../../shared/ui/modal";
import {
  createCampusSetup,
  createCampusAcademicUnit,
  deactivateCampus,
  listCampuses,
  listCampusAcademicUnits,
  reactivateCampus,
  updateCampus,
} from "../api/settings.api";
import type {
  AcademicUnitType,
  Campus,
  CampusAcademicUnit,
  CampusAcademicUnitInput,
  CampusInput,
} from "../model/settings.types";
import { useSelectedCampus } from "../model/selected-campus-provider";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { ModernSelect } from "../../../shared/ui/select";
import { Badge } from "../../../shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { Spinner } from "../../../shared/ui/spinner";

const emptyForm: CampusInput = {
  name: "",
  address: "",
  contactEmail: "",
  contactPhone: "",
};
const unitDefaults: Record<AcademicUnitType, CampusAcademicUnitInput> = {
  SCHOOL: { type: "SCHOOL", name: "School", curriculumOrAffiliationId: "CBSE" },
  PU: { type: "PU", name: "PU College", curriculumOrAffiliationId: "KARNATAKA_PUE" },
  DEGREE: {
    type: "DEGREE",
    name: "Degree College",
    curriculumOrAffiliationId: "BENGALURU_UNIVERSITY",
  },
};

export function CampusesManagement() {
  const { refreshCampuses } = useSelectedCampus();
  const [items, setItems] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CampusInput>(emptyForm);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | Campus["status"]>("ALL");
  const [units, setUnits] = useState<CampusAcademicUnit[]>([]);
  const [unitDrafts, setUnitDrafts] = useState<CampusAcademicUnitInput[]>([
    { ...unitDefaults.SCHOOL },
  ]);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([listCampuses(), listCampusAcademicUnits()])
      .then(([campuses, academicUnits]) => {
        setItems(campuses);
        setUnits(academicUnits);
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load campuses"),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (status !== "ALL" && item.status !== status) return false;
        const query = search.trim().toLowerCase();
        return (
          !query ||
          [item.name, item.address, item.contactEmail, item.contactPhone].some((value) =>
            value?.toLowerCase().includes(query),
          )
        );
      }),
    [items, search, status],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!editing && unitDrafts.length === 0) throw new Error("Select at least one academic unit");
      const campusInput: CampusInput = {
        name: form.name.trim(),
        ...(form.address?.trim() ? { address: form.address.trim() } : {}),
        ...(form.contactEmail?.trim() ? { contactEmail: form.contactEmail.trim() } : {}),
        ...(form.contactPhone?.trim() ? { contactPhone: form.contactPhone.trim() } : {}),
      };
      const setup = editing
        ? null
        : await createCampusSetup({ ...campusInput, academicUnits: unitDrafts });
      const saved = editing ? await updateCampus(editing.id, campusInput) : setup!.campus;
      if (setup) setUnits((current) => [...current, ...setup.academicUnits]);
      if (editing && unitDrafts.length) {
        const created: CampusAcademicUnit[] = [];
        for (const draft of unitDrafts)
          created.push(await createCampusAcademicUnit(editing.id, draft));
        setUnits((current) => [...current, ...created]);
      }
      setItems((current) =>
        (editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
        ).sort((left, right) => left.name.localeCompare(right.name)),
      );
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setUnitDrafts([{ ...unitDefaults.SCHOOL }]);
      await refreshCampuses();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create campus");
    } finally {
      setBusy(false);
    }
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setUnitDrafts([{ ...unitDefaults.SCHOOL }]);
    setOpen(true);
  }

  function startEdit(item: Campus) {
    setEditing(item);
    setForm({
      name: item.name,
      address: item.address ?? "",
      contactEmail: item.contactEmail ?? "",
      contactPhone: item.contactPhone ?? "",
    });
    setUnitDrafts([]);
    setOpen(true);
  }

  async function changeStatus(item: Campus) {
    setBusy(true);
    setError(null);
    try {
      const updated =
        item.status === "ACTIVE"
          ? await deactivateCampus(item.id)
          : await reactivateCampus(item.id);
      setItems((current) => current.map((campus) => (campus.id === updated.id ? updated : campus)));
      await refreshCampuses();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to change campus status");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading campuses" />;

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Campuses</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage school and college locations. Campus references are generated and remain stable.
          </p>
        </div>
        <Button size="sm" variant="brand" onClick={startCreate} className="h-8 text-xs font-bold">
          <Plus size={14} /> Add campus
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium"
        >
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            aria-label="Search campuses"
            placeholder="Search campus, location, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
        <ModernSelect
          aria-label="Campus status"
          value={status}
          onValueChange={(val) => setStatus(val as typeof status)}
          className="w-[130px]"
          options={[
            { label: "All statuses", value: "ALL" },
            { label: "Active", value: "ACTIVE" },
            { label: "Inactive", value: "INACTIVE" },
          ]}
        />
        <span className="text-xs text-slate-500 font-medium">
          {visibleItems.length} campus{visibleItems.length === 1 ? "" : "es"}
        </span>
      </div>

      {/* Table */}
      {visibleItems.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campus</TableHead>
                <TableHead>Academic units</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                        <Building2 size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {item.address || "Location not added"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <div className="flex flex-wrap gap-1">
                      {units
                        .filter((unit) => unit.campusId === item.id && unit.status === "ACTIVE")
                        .map((unit) => (
                          <Badge key={unit.id} variant="secondary">
                            {unit.type === "SCHOOL"
                              ? unit.curriculumOrAffiliationId.replaceAll("_", " ")
                              : unit.name}
                          </Badge>
                        ))}
                      {!units.some(
                        (unit) => unit.campusId === item.id && unit.status === "ACTIVE",
                      ) && (
                        <span className="text-xs text-amber-700">
                          Academic units not configured
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-700">{item.contactPhone || "No phone"}</p>
                    <p className="text-xs text-slate-500">{item.contactEmail || "No email"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit campus"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => startEdit(item)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={item.status === "ACTIVE" ? "Deactivate campus" : "Reactivate campus"}
                        aria-label={`${item.status === "ACTIVE" ? "Deactivate" : "Reactivate"} ${item.name}`}
                        disabled={busy}
                        onClick={() => void changeStatus(item)}
                      >
                        {item.status === "ACTIVE" ? <Ban size={14} /> : <RotateCcw size={14} />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No campuses found"
          description={
            items.length
              ? "Change the filters to see matching campuses."
              : "Add the first campus to continue tenant setup."
          }
        />
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? "Edit campus" : "Add campus"}
        description={
          editing
            ? "Update the campus profile without changing its generated reference."
            : "The campus reference is assigned automatically and cannot be edited."
        }
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="campus-name">Campus name</Label>
              <Input
                id="campus-name"
                required
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-phone">Contact phone</Label>
              <Input
                id="campus-phone"
                value={form.contactPhone ?? ""}
                onChange={(e) => setForm((v) => ({ ...v, contactPhone: e.target.value }))}
              />
            </div>
            <fieldset className="space-y-3 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-sm font-semibold text-slate-900">
                  {editing
                    ? "Add another board or academic unit"
                    : "Education offered at this campus"}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(["SCHOOL", "PU", "DEGREE"] as AcademicUnitType[]).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setUnitDrafts((current) => [...current, { ...unitDefaults[type] }])
                      }
                    >
                      <Plus size={13} />{" "}
                      {type === "SCHOOL"
                        ? "Add school board"
                        : type === "PU"
                          ? "Add PU unit"
                          : "Add degree unit"}
                    </Button>
                  ))}
                </div>
              </div>
              {unitDrafts.map((unit, index) => (
                <div
                  key={`${unit.type}-${index}`}
                  className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <div className="space-y-1.5">
                    <Label>
                      {unit.type === "SCHOOL"
                        ? "School name"
                        : unit.type === "PU"
                          ? "PU unit name"
                          : "Degree unit name"}
                    </Label>
                    <Input
                      value={unit.name}
                      onChange={(event) =>
                        setUnitDrafts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      {unit.type === "DEGREE" ? "University / affiliation" : "Board / curriculum"}
                    </Label>
                    <select
                      value={unit.curriculumOrAffiliationId}
                      onChange={(event) =>
                        setUnitDrafts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, curriculumOrAffiliationId: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      {unit.type === "SCHOOL" && (
                        <>
                          <option value="CBSE">CBSE</option>
                          <option value="STATE_BOARD">State Board</option>
                          <option value="ICSE">ICSE</option>
                        </>
                      )}
                      {unit.type === "PU" && (
                        <option value="KARNATAKA_PUE">Karnataka Pre-University Education</option>
                      )}
                      {unit.type === "DEGREE" && (
                        <>
                          <option value="BENGALURU_UNIVERSITY">Bengaluru University</option>
                          <option value="AUTONOMOUS">Autonomous</option>
                        </>
                      )}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="self-end"
                    aria-label={`Remove ${unit.name}`}
                    onClick={() =>
                      setUnitDrafts((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {!editing && unitDrafts.length === 0 && (
                <p className="text-xs font-medium text-amber-700">
                  Add at least one academic unit.
                </p>
              )}
              <p className="text-xs text-slate-500">
                Classes, streams, programs and semesters are configured after the campus is saved.
              </p>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="campus-email">Contact email</Label>
              <Input
                id="campus-email"
                type="email"
                value={form.contactEmail ?? ""}
                onChange={(e) => setForm((v) => ({ ...v, contactEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="campus-address">Address</Label>
              <textarea
                id="campus-address"
                value={form.address ?? ""}
                onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
              />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create campus"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
