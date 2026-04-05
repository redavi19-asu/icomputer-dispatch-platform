import { redirect } from "next/navigation";

export default function BookingPage() {
	// Keep /booking as a clean entry point by routing to a real branded booking flow.
	redirect("/chargenext/booking");
}
