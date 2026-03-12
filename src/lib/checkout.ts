export async function startEmergencyCharge() {
  try {
    const response = await fetch(
      "https://chargenext-api.ryanedavis.workers.dev/checkout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier: "Emergency Boost",
          amount: 59,
        }),
      }
    );

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error("Error starting emergency charge:", error);
  }
}
