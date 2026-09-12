import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current-user";
import { getTicketDetail } from "@/lib/queries/helpdesk";
import { formatDateTime, humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/helpdesk/TicketBadges";
import { TicketReplyForm, TicketStatusControl } from "@/components/helpdesk/TicketThread";
import { cn } from "@/lib/cn";

// Deliberately static: a ticket subject can contain whatever a guardian
// typed, and it would end up in the browser title and any shared link.
export const metadata: Metadata = { title: "Message" };

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  // Scoped lookup: a ticket this session can't see 404s rather than 403s, so
  // the response doesn't confirm that someone else's ticket id is real.
  const ticket = await getTicketDetail(id, session);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Private Messages", href: "/helpdesk" }, { label: ticket.subject }]}
        title={ticket.subject}
        description={`Opened by ${ticket.raisedBy.name} · ${formatDateTime(ticket.createdAt)}`}
        actions={
          session.role === "PRINCIPAL" ? (
            <TicketStatusControl ticketId={ticket.id} current={ticket.status} />
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketPriorityBadge priority={ticket.priority} />
        {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
        {ticket.assignedTo && <Badge variant="neutral">Assigned to {ticket.assignedTo.name}</Badge>}
        {ticket.resolvedAt && (
          <Badge variant="success">Resolved {formatDateTime(ticket.resolvedAt)}</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {ticket.messages.map((message) => {
              // The signed-in person's own messages sit on the right, the way
              // every messaging interface people already use behaves.
              const mine = message.author.id === session.userId;
              return (
                <li
                  key={message.id}
                  className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}
                >
                  <Avatar name={message.author.name} size="sm" />
                  <div className={cn("min-w-0 max-w-[85%]", mine && "text-right")}>
                    <p className="text-xs text-fg-subtle">
                      {mine ? "You" : message.author.name}
                      <span className="mx-1" aria-hidden="true">
                        ·
                      </span>
                      {humanizeEnum(message.author.role)}
                      <span className="mx-1" aria-hidden="true">
                        ·
                      </span>
                      {formatDateTime(message.createdAt)}
                    </p>
                    <div
                      className={cn(
                        "mt-1 inline-block whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-left text-sm leading-relaxed",
                        mine
                          ? "bg-brand-soft text-fg"
                          : "border border-line bg-surface-sunken text-fg-muted"
                      )}
                    >
                      {message.message}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <TicketReplyForm ticketId={ticket.id} closed={ticket.status === "CLOSED"} />
    </div>
  );
}
