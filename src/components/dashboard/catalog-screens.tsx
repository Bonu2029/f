"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { DashboardShell } from "./dashboard-shell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Avatar, Media } from "@/components/ui/media";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState, Rating, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useBusinessContext } from "@/lib/hooks";
import { useActions } from "@/lib/store";
import { CATEGORIES } from "@/lib/data/categories";
import { formatCents } from "@/lib/pricing";
import { formatDuration, toDateOnly } from "@/lib/time";
import { newId, slugify } from "@/lib/utils";
import type { Service, Staff } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Services                                                                    */
/* -------------------------------------------------------------------------- */

export function ServicesScreen() {
  const context = useBusinessContext();
  const { upsertService, deleteService } = useActions();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  if (!context) {
    return (
      <DashboardShell title="Services">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business, services, staff } = context;
  const active = services.filter((s) => s.is_active);

  return (
    <DashboardShell
      title="Services"
      subtitle={`${active.length} bookable services`}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          <span className="hidden sm:inline">Add service</span>
        </Button>
      }
    >
      {active.length === 0 ? (
        <EmptyState
          title="No services yet"
          body="Add what you offer, how long it takes and what it costs — that's everything NOW needs to sell your time."
          action={<Button onClick={() => setCreating(true)}>Add your first service</Button>}
        />
      ) : (
        <div className="grid gap-2.5">
          {active.map((service) => {
            const providers = state.staffServices.filter((ss) => ss.service_id === service.id).length;
            const category = CATEGORIES.find((c) => c.id === service.category_id);
            return (
              <Card key={service.id} className="flex flex-wrap items-center gap-4 p-4">
                <Media seed={service.media_seed} icon={category?.icon} className="h-14 w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15.5px] font-semibold text-ink">{service.name}</h3>
                    {!service.online_booking_enabled && <Badge tone="caution">Online booking off</Badge>}
                    {service.deposit_cents && (
                      <Badge tone="neutral">
                        {formatCents(service.deposit_cents, { showCents: false })} deposit
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-muted">{service.description}</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {formatDuration(service.duration_minutes)} · {service.buffer_minutes} min buffer ·{" "}
                    {providers} {providers === 1 ? "provider" : "providers"}
                  </p>
                </div>
                <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink">
                  {service.price_cents === 0 ? "Free" : formatCents(service.price_cents, { showCents: false })}
                </p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(service)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${service.name}`}
                    onClick={() => {
                      deleteService(service.id);
                      toast({ title: `${service.name} removed`, tone: "success" });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ServiceModal
        open={creating || editing != null}
        service={editing}
        businessId={business.id}
        staffCount={staff.length}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(service) => {
          upsertService(service);
          toast({ title: editing ? "Service updated" : "Service added", tone: "success" });
          setCreating(false);
          setEditing(null);
        }}
      />
      <div className="h-6" />
    </DashboardShell>
  );
}

function ServiceModal({
  open,
  service,
  businessId,
  staffCount,
  onClose,
  onSave,
}: {
  open: boolean;
  service: Service | null;
  businessId: string;
  staffCount: number;
  onClose: () => void;
  onSave: (service: Service) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(45);
  const [buffer, setBuffer] = useState(10);
  const [price, setPrice] = useState(50);
  const [deposit, setDeposit] = useState(0);
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [online, setOnline] = useState(true);
  const [key, setKey] = useState("");

  // Re-seed the form whenever a different service is opened.
  const formKey = `${open}-${service?.id ?? "new"}`;
  if (formKey !== key) {
    setKey(formKey);
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setDuration(service?.duration_minutes ?? 45);
    setBuffer(service?.buffer_minutes ?? 10);
    setPrice(service ? service.price_cents / 100 : 50);
    setDeposit(service?.deposit_cents ? service.deposit_cents / 100 : 0);
    setCategoryId(service?.category_id ?? CATEGORIES[0].id);
    setOnline(service?.online_booking_enabled ?? true);
  }

  function save() {
    onSave({
      id: service?.id ?? newId(),
      business_id: businessId,
      category_id: categoryId,
      name: name.trim() || "Untitled service",
      description: description.trim(),
      duration_minutes: duration,
      buffer_minutes: buffer,
      price_cents: Math.round(price * 100),
      deposit_cents: deposit > 0 ? Math.round(deposit * 100) : null,
      media_seed: service?.media_seed ?? slugify(name || "service"),
      online_booking_enabled: online,
      is_active: true,
      sort_order: service?.sort_order ?? 99,
      created_at: service?.created_at ?? new Date().toISOString(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? "Edit service" : "Add a service"}
      size="lg"
      footer={
        <Button fullWidth onClick={save}>
          {service ? "Save changes" : "Add service"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Service name" htmlFor="svc-name" required>
          <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gel Manicure" />
        </Field>
        <Field label="Category" htmlFor="svc-category">
          <Select id="svc-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="svc-description">
          <Textarea
            id="svc-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's included? Anything customers should know beforehand?"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)" htmlFor="svc-duration">
            <Input
              id="svc-duration"
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
          <Field label="Buffer after (minutes)" htmlFor="svc-buffer" hint="Clean-up or turnaround time.">
            <Input
              id="svc-buffer"
              type="number"
              min={0}
              step={5}
              value={buffer}
              onChange={(e) => setBuffer(Number(e.target.value))}
            />
          </Field>
          <Field label="Price ($)" htmlFor="svc-price">
            <Input
              id="svc-price"
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </Field>
          <Field label="Deposit ($)" htmlFor="svc-deposit" hint="0 for no deposit.">
            <Input
              id="svc-deposit"
              type="number"
              min={0}
              step={5}
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Photo">
          <Button variant="outline" size="sm" disabled>
            Upload photo
          </Button>
        </Field>
        <Switch
          checked={online}
          onChange={setOnline}
          label="Available for online booking"
          description={`Assigned to ${staffCount} team ${staffCount === 1 ? "member" : "members"} — manage in Team.`}
        />
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Team                                                                        */
/* -------------------------------------------------------------------------- */

export function TeamScreen() {
  const context = useBusinessContext();
  const { upsertStaff, deleteStaff } = useActions();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);

  if (!context) {
    return (
      <DashboardShell title="Team">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </DashboardShell>
    );
  }

  const { state, business, staff, services, now } = context;
  const monthStart = `${toDateOnly(now).slice(0, 7)}-01`;

  return (
    <DashboardShell
      title="Team"
      subtitle={`${staff.length} people take bookings`}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          <span className="hidden sm:inline">Add member</span>
        </Button>
      }
    >
      {staff.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No team members yet"
          body="Add the people who take appointments so customers can pick who they see."
          action={<Button onClick={() => setCreating(true)}>Add a team member</Button>}
        />
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {staff.map((member) => {
            const memberServices = state.staffServices.filter((ss) => ss.staff_id === member.id);
            const appointments = state.appointments.filter(
              (a) => a.staff_id === member.id && a.date >= monthStart && a.status !== "cancelled_by_customer",
            );
            const revenue = appointments.reduce((sum, a) => sum + a.payout_cents, 0);
            const openings = state.slots.filter(
              (s) => s.staff_id === member.id && s.status === "available",
            ).length;

            return (
              <Card key={member.id} className="p-4">
                <div className="flex items-start gap-3.5">
                  <Avatar seed={member.media_seed} name={member.full_name} size={52} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15.5px] font-semibold text-ink">{member.full_name}</h3>
                    <p className="truncate text-[13px] text-ink-muted">{member.role}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Rating value={member.rating} count={member.review_count} />
                      {!member.accepts_online_booking && <Badge tone="caution">Offline only</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(member)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${member.full_name}`}
                      onClick={() => {
                        deleteStaff(member.id);
                        toast({ title: `${member.full_name} removed from the team`, tone: "success" });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{member.bio}</p>

                <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-line-soft pt-3 text-center">
                  <Stat label="Services" value={`${memberServices.length}`} />
                  <Stat label="Bookings" value={`${appointments.length}`} />
                  <Stat label="Revenue" value={formatCents(revenue, { showCents: false })} />
                  <Stat label="Open" value={`${openings}`} />
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      <StaffModal
        open={creating || editing != null}
        staff={editing}
        businessId={business.id}
        services={services}
        assignedIds={
          editing
            ? state.staffServices.filter((ss) => ss.staff_id === editing.id).map((ss) => ss.service_id)
            : services.map((s) => s.id)
        }
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(member, serviceIds) => {
          upsertStaff(member, serviceIds);
          toast({ title: editing ? "Team member updated" : "Team member added", tone: "success" });
          setCreating(false);
          setEditing(null);
        }}
      />
      <div className="h-6" />
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-[15px] font-semibold tabular-nums text-ink">{value}</dd>
      <dt className="text-[11.5px] text-ink-muted">{label}</dt>
    </div>
  );
}

function StaffModal({
  open,
  staff,
  businessId,
  services,
  assignedIds,
  onClose,
  onSave,
}: {
  open: boolean;
  staff: Staff | null;
  businessId: string;
  services: Service[];
  assignedIds: string[];
  onClose: () => void;
  onSave: (staff: Staff, serviceIds: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [online, setOnline] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [key, setKey] = useState("");

  const formKey = `${open}-${staff?.id ?? "new"}`;
  if (formKey !== key) {
    setKey(formKey);
    setName(staff?.full_name ?? "");
    setRole(staff?.role ?? "Stylist");
    setBio(staff?.bio ?? "");
    setOnline(staff?.accepts_online_booking ?? true);
    setSelected(assignedIds);
  }

  const memo = useMemo(() => services, [services]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={staff ? "Edit team member" : "Add a team member"}
      size="lg"
      footer={
        <Button
          fullWidth
          onClick={() =>
            onSave(
              {
                id: staff?.id ?? newId(),
                business_id: businessId,
                user_id: staff?.user_id ?? null,
                full_name: name.trim() || "New team member",
                role: role.trim() || "Stylist",
                bio: bio.trim(),
                media_seed: staff?.media_seed ?? slugify(name || "staff"),
                rating: staff?.rating ?? 5,
                review_count: staff?.review_count ?? 0,
                is_active: true,
                accepts_online_booking: online,
                created_at: staff?.created_at ?? new Date().toISOString(),
              },
              selected,
            )
          }
        >
          {staff ? "Save changes" : "Add member"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="staff-name" required>
          <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Role" htmlFor="staff-role">
          <Input id="staff-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Stylist" />
        </Field>
        <Field label="Bio" htmlFor="staff-bio">
          <Textarea id="staff-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <Field label="Photo">
          <Button variant="outline" size="sm" disabled>
            Upload photo
          </Button>
        </Field>
        <Field label="Services offered" hint="Only these appear when customers pick this person.">
          <div className="rounded-xl border border-line px-3 py-1">
            {memo.map((service) => (
              <Checkbox
                key={service.id}
                checked={selected.includes(service.id)}
                onChange={(next) =>
                  setSelected((prev) =>
                    next ? [...prev, service.id] : prev.filter((id) => id !== service.id),
                  )
                }
                label={`${service.name} · ${formatDuration(service.duration_minutes)}`}
              />
            ))}
          </div>
        </Field>
        <Switch
          checked={online}
          onChange={setOnline}
          label="Accepts online bookings"
          description="Working hours follow the shop's opening hours by default."
        />
      </div>
    </Modal>
  );
}
