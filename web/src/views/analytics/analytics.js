const FAST_API_URL = 'http://127.0.0.1:8000';

function formatCurrencyToPhp(amount) {
    const num = parseFloat(amount) || 0;

    return '₱' + num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatCurrencyToThousandPhp(amount) {
    const num = parseFloat(amount) || 0;

    if (num >= 1000) {
        return '₱' + (num / 1000).toFixed(2) + ' K';
    }
    return '₱' + num.toFixed(2);
}

async function fetchAnalytics() {
    try {
        const response = await fetch(`${FAST_API_URL}/analytics/`);

        // Check if request was successful
        if (!response.ok) {
            throw new Error('Failed to fetch analytics data');
        }

        // Parse JSON response and return
        return await response.json();

    } catch (error) {
        console.error('Error fetching analytics:', error);
        return null;
    }
}

// Returns: { year_number, monthly_data: [{ month_number, month_name, sales }, ...] }
async function fetchAnnualBreakdown(year = null) {
    try {
        // Build URL - add year parameter if provided
        let url = `${FAST_API_URL}/analytics/annual-breakdown`;
        if (year) {
            url += `?year_number=${year}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch annual breakdown data');
        }

        return await response.json();

    } catch (error) {
        console.error('Error fetching annual breakdown:', error);
        return null;
    }
}

// Populate the 4 summary cards with API data
function updateSummaryCards(data) {
    // Guard clause: exit if no data
    if (!data) return;

    // Card 1: Uncollected Balance (sum(total_balance) from API)
    document.getElementById('uncollected-balance').textContent = formatCurrencyToPhp(data.total_balance);

    // Card 2: Annual Sales
    document.getElementById('annual-sales').textContent = formatCurrencyToPhp(data.annual_sales);

    // Card 3: Total Orders (completed + pending)
    const totalOrders = data.total_completed_order + data.total_pending_order;
    document.getElementById('total-orders').textContent = totalOrders;

    // Card 4: Pending Orders
    document.getElementById('pending-orders').textContent = data.total_pending_order;
}

//LINE CHART

// Store chart instance to prevent duplicates
let salesChart = null;

// Create the sales line chart using Chart.js
function createSalesChart(breakdownData) {
    // Guard clause: exit if no data
    if (!breakdownData) return;

    // Destroy existing chart if it exists (prevents duplicates)
    if (salesChart) {
        salesChart.destroy();
    }

    // Get the canvas element's 2D rendering context
    const ctx = document.getElementById('sales-chart').getContext('2d');

    // Extract month labels (Jan, Feb, Mar, ...) from monthly_data
    // .substring(0, 3) shortens "January" to "Jan"
    const labels = breakdownData.monthly_data.map(m => m.month_name.substring(0, 3));

    // Extract sales values as numbers
    const salesData = breakdownData.monthly_data.map(m => parseFloat(m.sales) || 0);

    // Calculate total sales for the year (sum of all months)
    const totalSales = salesData.reduce((sum, val) => sum + val, 0);

    // Update the "Total Sales" value in the chart card header
    document.getElementById('total-sales-value').textContent = formatCurrencyToThousandPhp(totalSales);

    // Update the year label on Card 2
    document.getElementById('annual-sales-year').textContent = `Year ${breakdownData.year_number}`;

    // Create new Chart.js chart
    salesChart = new Chart(ctx, {
        type: 'line', // Line chart type

        data: {
            labels: labels, // X-axis labels (months)
            datasets: [{
                label: 'Monthly Sales',
                data: salesData, // Y-axis data points

                // Line styling
                borderColor: '#550000',           // Maroon
                backgroundColor: 'rgba(128, 0, 0, 0.15)', // Fill under line
                borderWidth: 1.5,
                fill: true,                        // Enable fill under line
                tension: 0.3,                      // Curve smoothing (0 = straight lines)

                // Point styling
                pointBackgroundColor: '550000',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,                    // Point size
                pointHoverRadius: 6                // Point size on hover
            }]
        },

        options: {
            responsive: true,              // Chart resizes with container
            maintainAspectRatio: false,    // Allows chart to fill container height

            plugins: {
                legend: {
                    display: false         // Hide legend (we only have one dataset)
                },
                tooltip: {
                    callbacks: {
                        // Format tooltip to show peso amount
                        label: function(context) {
                            return formatCurrencyToPhp(context.parsed.y);
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)' // Light gridlines
                    },
                    ticks: {
                        color: '#666'                 // Axis label color
                    }
                },
                y: {
                    beginAtZero: true,                // Start Y-axis at 0
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#666',
                        // Format Y-axis labels as peso with K suffix
                        callback: function(value) {
                            if (value >= 1000) {
                                return '₱' + (value / 1000).toFixed(1) + 'K';
                            }
                            return '₱' + value;
                        }
                    }
                }
            },

            interaction: {
                intersect: false,    // Tooltip shows when hovering anywhere on vertical line
                mode: 'index'        // Show tooltip for all datasets at that index
            }
        }
    });
}


// Main function - runs when page loads
// analytics.js

async function initAnalytics() {
    // Get loader and the content
    const loader = document.getElementById('dashboard-loader');
    const content = document.getElementById('dashboard-content');

    try {
        // Fetch data 
        const [analyticsData, breakdownData] = await Promise.all([
            fetchAnalytics(),
            fetchAnnualBreakdown()
        ]);

        // SWAP VISIBILITY
        // Hide the loader
        if (loader) loader.classList.add('d-none');
        
        // Show the content
        if (content) content.classList.remove('d-none');

        // Update the text data
        updateSummaryCards(analyticsData);

        // Draw the Chart
        // We use a small timeout to let the browser recognize the div is now visible
        // before Chart.js tries to calculate the width/height.
        setTimeout(() => {
            createSalesChart(breakdownData);
        }, 50);

    } catch (error) {
        console.error("Error loading dashboard:", error);
        
        // Error message if fetch fails
        if (loader) {
            loader.innerHTML = `
                <div class="text-danger fw-bold">
                    <p>Failed to load data: ${error.message}</p>
                </div>`;
        }
    }
}

// Logout button handler
document.getElementById('logout-btn').addEventListener('click', function() {
    // Clear any session data if necessary
    window.location.href = "../auth/index.html";
});

// Run initAnalytics when DOM is fully loaded
window.addEventListener('DOMContentLoaded', initAnalytics);
