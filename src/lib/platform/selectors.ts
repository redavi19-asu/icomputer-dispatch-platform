import { companies, customers, drivers, jobs, bookingPageConfigs } from "./mock-data";

export function getCompanyBySlug(slug: string) {
  return companies.find((company) => company.slug === slug) ?? null;
}

export function getCompanyById(companyId: string) {
  return companies.find((company) => company.id === companyId) ?? null;
}

export function getDriversByCompany(companyId: string) {
  return drivers.filter((driver) => driver.companyId === companyId);
}

export function getJobsByCompany(companyId: string) {
  return jobs.filter((job) => job.companyId === companyId);
}

export function getCustomersByCompany(companyId: string) {
  return customers.filter((customer) => customer.companyId === companyId);
}

export function getBookingPageConfigByCompany(companyId: string) {
  return bookingPageConfigs.find((config) => config.companyId === companyId) ?? null;
}
