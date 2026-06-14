interface SectionPlaceholderPageProps {
  title: string
  description: string
}

export const SectionPlaceholderPage = ({ title, description }: SectionPlaceholderPageProps): JSX.Element => (
  <section className="rounded-modal border border-surface-100 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900">
    <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-50">{title}</h1>
    <p className="mt-2 text-sm text-surface-800 dark:text-surface-100">{description}</p>
  </section>
)
