import { Header } from "@/components/header";
import { NotFoundPage } from "@/components/not-found";


export default function page() {
	return (
		<>
			<Header />
			<NotFoundPage />
			<NotFoundPage />
		</>
	);
}
