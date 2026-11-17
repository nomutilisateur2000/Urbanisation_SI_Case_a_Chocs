
export function getTotalTickets(tickets) {
  return tickets.length;
}

export function getTotalRevenue(tickets) {
  return tickets.reduce((total, ticket) => {
    return total + Number(ticket.price?.amount || 0);
  }, 0);
}

export function getAverageTicketPrice(tickets) {
  if (tickets.length === 0) return 0;

  return getTotalRevenue(tickets) / tickets.length;
}

export function getTicketsByEvent(tickets) {
  return tickets.reduce((result, ticket) => {
    const event = ticket.eventName || "Inconnu";

    result[event] = (result[event] || 0) + 1;

    return result;
  }, {});
}
