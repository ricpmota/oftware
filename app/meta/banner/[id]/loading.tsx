/** Mesmo fundo da home pública (www.oftware.com.br). */
const DEEP_BLUE = '#0A1F44';

export default function BannerDetailLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: DEEP_BLUE }}
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-2 border-[#4CCB7A] border-t-transparent"
        aria-hidden
      />
    </div>
  );
}
