import { UrbanCarrierMark } from "@/components/branding/urban-carrier-mark";

export default function CustomerPage() {
	return (
		<main className="min-h-screen bg-[linear-gradient(135deg,#061a33,#0a4a91)] text-white">
			<section className="mx-auto max-w-4xl px-6 py-16"><UrbanCarrierMark href="/" size="lg" showText />
				<h1 className="mt-8 className="text-2xl font-semibold">Customer</h1>
			</section>
		</main>
	);
}
