// This function will be called from the client and makes a fetch request to our API
export async function createOrganization(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  try {
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.error || "Failed to create organization" };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error creating organization:", error);
    return { success: false, error: "Failed to create organization" };
  }
}