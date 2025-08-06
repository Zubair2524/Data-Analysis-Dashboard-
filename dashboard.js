// Global variables
let originalData = [];
let filteredData = [];
let charts = {};
let activeFilters = {
    brand: null,
    category: null,
    molecule: null,
    sku: null
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadCSVData();
    setupEventListeners();
});

// Load CSV data
async function loadCSVData() {
    try {
        const response = await fetch('data.csv');
        const csvText = await response.text();
        originalData = parseCSV(csvText);
        filteredData = [...originalData];
        
        initializeDashboard();
    } catch (error) {
        console.error('Error loading CSV:', error);
        // Generate sample data if CSV fails to load
        generateSampleData();
        initializeDashboard();
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            const value = values[index] || '';
            
            // Convert numeric fields
            if (header.toLowerCase().includes('value') || header.toLowerCase().includes('unit') || header.toLowerCase().includes('growth')) {
                row[header] = parseFloat(value.replace(/[$,]/g, '')) || 0;
            } else {
                row[header] = value;
            }
        });
        
        return row;
    });
}

// Generate sample data if CSV is not available
function generateSampleData() {
    const brands = ['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Under Armour', 'Converse', 'Vans'];
    const categories = ['Shoes', 'Clothing', 'Accessories', 'Sports Equipment', 'Fitness Gear'];
    const molecules = ['Molecule X', 'Molecule Y', 'Molecule Z', 'Molecule W', 'Molecule V'];
    
    originalData = [];
    
    for (let i = 0; i < 100; i++) {
        const value25 = Math.random() * 1000000000 + 100000000;
        const unit25 = Math.floor(Math.random() * 10000000 + 1000000);
        const valueGrowth = (Math.random() - 0.5) * 20;
        const unitGrowth = (Math.random() - 0.5) * 15;
        
        originalData.push({
            'Molecule': molecules[Math.floor(Math.random() * molecules.length)],
            'Category': categories[Math.floor(Math.random() * categories.length)],
            'Brand': brands[Math.floor(Math.random() * brands.length)],
            'SKU': `SKU${String(i + 1).padStart(3, '0')}`,
            'Value25': value25,
            'Unit25': unit25,
            'GrowthValue25': valueGrowth,
            'GrowthUnit25': unitGrowth
        });
    }
    
    filteredData = [...originalData];
}

// Initialize dashboard
function initializeDashboard() {
    setupFilters();
    setupTabs();
    updateKPIs();
    createCharts();
    updateDataTable();
    updateStats();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    
    // Setup filter inputs
    ['brandFilter', 'categoryFilter', 'moleculeFilter', 'skuFilter'].forEach(filterId => {
        const input = document.getElementById(filterId);
        input.addEventListener('input', (e) => handleFilterInput(e, filterId));
        input.addEventListener('focus', (e) => showDropdown(filterId));
        input.addEventListener('blur', (e) => setTimeout(() => hideDropdown(filterId), 200));
    });
}

// Setup tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Recreate charts for the active tab
            setTimeout(() => {
                createCharts();
            }, 100);
        });
    });
}

// Setup filters
function setupFilters() {
    const filterConfigs = [
        { id: 'brandFilter', field: 'Brand' },
        { id: 'categoryFilter', field: 'Category' },
        { id: 'moleculeFilter', field: 'Molecule' },
        { id: 'skuFilter', field: 'SKU' }
    ];
    
    filterConfigs.forEach(config => {
        const uniqueValues = [...new Set(originalData.map(item => item[config.field]))].sort();
        populateDropdown(config.id, uniqueValues);
    });
}

// Populate dropdown with options
function populateDropdown(filterId, options) {
    const dropdownId = filterId.replace('Filter', 'Dropdown');
    const dropdown = document.getElementById(dropdownId);
    
    dropdown.innerHTML = '';
    
    // Add "All" option
    const allOption = document.createElement('div');
    allOption.className = 'dropdown-item';
    allOption.textContent = 'All';
    allOption.addEventListener('click', () => selectFilterOption(filterId, null));
    dropdown.appendChild(allOption);
    
    // Add individual options
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'dropdown-item';
        optionElement.textContent = option;
        optionElement.addEventListener('click', () => selectFilterOption(filterId, option));
        dropdown.appendChild(optionElement);
    });
}

// Handle filter input
function handleFilterInput(event, filterId) {
    const searchTerm = event.target.value.toLowerCase();
    const dropdownId = filterId.replace('Filter', 'Dropdown');
    const dropdown = document.getElementById(dropdownId);
    const items = dropdown.querySelectorAll('.dropdown-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
    
    showDropdown(filterId);
}

// Show dropdown
function showDropdown(filterId) {
    const dropdownId = filterId.replace('Filter', 'Dropdown');
    document.getElementById(dropdownId).classList.add('show');
}

// Hide dropdown
function hideDropdown(filterId) {
    const dropdownId = filterId.replace('Filter', 'Dropdown');
    document.getElementById(dropdownId).classList.remove('show');
}

// Select filter option
function selectFilterOption(filterId, value) {
    const input = document.getElementById(filterId);
    const filterKey = filterId.replace('Filter', '').toLowerCase();
    
    input.value = value || '';
    activeFilters[filterKey] = value;
    
    hideDropdown(filterId);
    applyFilters();
}

// Apply filters
function applyFilters() {
    filteredData = originalData.filter(item => {
        return Object.keys(activeFilters).every(key => {
            if (!activeFilters[key]) return true;
            
            const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
            if (key === 'sku') fieldName = 'SKU';
            return item[fieldName] === activeFilters[key];
        });
    });
    
    updateKPIs();
    updateCharts();
    updateDataTable();
    updateStats();
}

// Clear all filters
function clearAllFilters() {
    activeFilters = {
        brand: null,
        category: null,
        molecule: null,
        sku: null
    };
    
    // Clear input values
    ['brandFilter', 'categoryFilter', 'moleculeFilter', 'skuFilter'].forEach(filterId => {
        document.getElementById(filterId).value = '';
    });
    
    filteredData = [...originalData];
    updateKPIs();
    updateCharts();
    updateDataTable();
    updateStats();
}

// Update KPIs
function updateKPIs() {
    const totalValue = filteredData.reduce((sum, item) => sum + (item.Value25 || 0), 0);
    const totalUnits = filteredData.reduce((sum, item) => sum + (item.Unit25 || 0), 0);
    const avgValueGrowth = filteredData.length > 0 ? 
        filteredData.reduce((sum, item) => sum + (item.GrowthValue25 || 0), 0) / filteredData.length : 0;
    const avgUnitGrowth = filteredData.length > 0 ? 
        filteredData.reduce((sum, item) => sum + (item.GrowthUnit25 || 0), 0) / filteredData.length : 0;
    
    document.getElementById('totalValue').textContent = formatLargeNumber(totalValue, true);
    document.getElementById('totalUnits').textContent = formatLargeNumber(totalUnits);
    document.getElementById('valueGrowth').textContent = formatPercentage(avgValueGrowth);
    document.getElementById('unitGrowth').textContent = formatPercentage(avgUnitGrowth);
    
    // Color code growth rates
    const valueGrowthElement = document.getElementById('valueGrowth');
    const unitGrowthElement = document.getElementById('unitGrowth');
    
    valueGrowthElement.style.color = avgValueGrowth >= 0 ? '#4caf50' : '#f44336';
    unitGrowthElement.style.color = avgUnitGrowth >= 0 ? '#4caf50' : '#f44336';
}

// Update stats
function updateStats() {
    document.getElementById('totalRecords').textContent = formatNumber(originalData.length);
    document.getElementById('filteredRecords').textContent = formatNumber(filteredData.length);
}

// Create charts
function createCharts() {
    const activeTab = document.querySelector('.tab-content.active').id;
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    charts = {};
    
    switch(activeTab) {
        case 'overview':
            createTopBrandsValueChart();
            createTopBrandsUnitsChart();
            createCategoriesChart();
            createMoleculesChart();
            break;
        case 'performance':
            createValueGrowthChart();
            createUnitGrowthChart();
            createScatterChart();
            break;
        case 'analysis':
            createBrandMarketShareChart();
            createCategoryPerformanceChart();
            createMoleculeDistributionChart();
            createRadarChart();
            break;
    }
}

// Update charts
function updateCharts() {
    createCharts();
}

// Create top brands value chart
function createTopBrandsValueChart() {
    const aggregatedData = aggregateDataByField('Brand');
    const sortedData = aggregatedData
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);
    
    const ctx = document.getElementById('topBrandsValueChart');
    if (!ctx) return;
    
    charts.topBrandsValue = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item.name),
            datasets: [{
                label: 'Total Value',
                data: sortedData.map(item => item.totalValue),
                backgroundColor: generateGradientColors(sortedData.length),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: getChartOptions('Value', (event, activeElements) => {
            if (activeElements.length > 0) {
                const index = activeElements[0].index;
                const brandName = sortedData[index].name;
                selectFilterOption('brandFilter', brandName);
            }
        })
    });
}

// Create top brands units chart
function createTopBrandsUnitsChart() {
    const aggregatedData = aggregateDataByField('Brand');
    const sortedData = aggregatedData
        .sort((a, b) => b.totalUnits - a.totalUnits)
        .slice(0, 5);
    
    const ctx = document.getElementById('topBrandsUnitsChart');
    if (!ctx) return;
    
    charts.topBrandsUnits = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item.name),
            datasets: [{
                label: 'Total Units',
                data: sortedData.map(item => item.totalUnits),
                backgroundColor: generateGradientColors(sortedData.length, 1),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: getChartOptions('Units', (event, activeElements) => {
            if (activeElements.length > 0) {
                const index = activeElements[0].index;
                const brandName = sortedData[index].name;
                selectFilterOption('brandFilter', brandName);
            }
        })
    });
}

// Create categories chart
function createCategoriesChart() {
    const aggregatedData = aggregateDataByField('Category');
    
    const ctx = document.getElementById('categoriesChart');
    if (!ctx) return;
    
    charts.categories = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: aggregatedData.map(item => item.name),
            datasets: [{
                data: aggregatedData.map(item => item.totalValue),
                backgroundColor: generateGradientColors(aggregatedData.length, 2),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 3
            }]
        },
        options: {
            ...getChartOptions(),
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const categoryName = aggregatedData[index].name;
                    selectFilterOption('categoryFilter', categoryName);
                }
            }
        }
    });
}

// Create molecules chart
function createMoleculesChart() {
    const aggregatedData = aggregateDataByField('Molecule');
    
    const ctx = document.getElementById('moleculesChart');
    if (!ctx) return;
    
    charts.molecules = new Chart(ctx.getContext('2d'), {
        type: 'polarArea',
        data: {
            labels: aggregatedData.map(item => item.name),
            datasets: [{
                data: aggregatedData.map(item => item.totalValue),
                backgroundColor: generateGradientColors(aggregatedData.length, 3),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2
            }]
        },
        options: {
            ...getChartOptions(),
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const moleculeName = aggregatedData[index].name;
                    selectFilterOption('moleculeFilter', moleculeName);
                }
            }
        }
    });
}

// Create value growth chart
function createValueGrowthChart() {
    const aggregatedData = aggregateDataByField('Brand');
    const sortedData = aggregatedData.sort((a, b) => b.avgValueGrowth - a.avgValueGrowth);
    
    const ctx = document.getElementById('valueGrowthChart');
    if (!ctx) return;
    
    charts.valueGrowth = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item.name),
            datasets: [{
                label: 'Value Growth %',
                data: sortedData.map(item => item.avgValueGrowth),
                backgroundColor: sortedData.map(item => 
                    item.avgValueGrowth >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'
                ),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: getChartOptions('Growth %', (event, activeElements) => {
            if (activeElements.length > 0) {
                const index = activeElements[0].index;
                const brandName = sortedData[index].name;
                selectFilterOption('brandFilter', brandName);
            }
        })
    });
}

// Create unit growth chart
function createUnitGrowthChart() {
    const aggregatedData = aggregateDataByField('Brand');
    const sortedData = aggregatedData.sort((a, b) => b.avgUnitGrowth - a.avgUnitGrowth);
    
    const ctx = document.getElementById('unitGrowthChart');
    if (!ctx) return;
    
    charts.unitGrowth = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedData.map(item => item.name),
            datasets: [{
                label: 'Unit Growth %',
                data: sortedData.map(item => item.avgUnitGrowth),
                backgroundColor: sortedData.map(item => 
                    item.avgUnitGrowth >= 0 ? 'rgba(33, 150, 243, 0.8)' : 'rgba(255, 143, 0, 0.8)'
                ),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: getChartOptions('Growth %', (event, activeElements) => {
            if (activeElements.length > 0) {
                const index = activeElements[0].index;
                const brandName = sortedData[index].name;
                selectFilterOption('brandFilter', brandName);
            }
        })
    });
}

// Create scatter chart
function createScatterChart() {
    const scatterData = filteredData.map(item => ({
        x: item.Value25 || 0,
        y: item.Unit25 || 0,
        label: item.Brand
    }));
    
    const ctx = document.getElementById('scatterChart');
    if (!ctx) return;
    
    charts.scatter = new Chart(ctx.getContext('2d'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Value vs Units',
                data: scatterData,
                backgroundColor: 'rgba(123, 31, 162, 0.6)',
                borderColor: 'rgba(123, 31, 162, 1)',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 12
            }]
        },
        options: {
            ...getChartOptions('Value', null, 'Units'),
            interaction: {
                intersect: false,
                mode: 'point'
            }
        }
    });
}

// Create brand market share chart
function createBrandMarketShareChart() {
    const aggregatedData = aggregateDataByField('Brand');
    
    const ctx = document.getElementById('brandMarketShareChart');
    if (!ctx) return;
    
    charts.brandMarketShare = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: aggregatedData.map(item => item.name),
            datasets: [{
                data: aggregatedData.map(item => item.totalValue),
                backgroundColor: generateGradientColors(aggregatedData.length, 4),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 3
            }]
        },
        options: {
            ...getChartOptions(),
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const brandName = aggregatedData[index].name;
                    selectFilterOption('brandFilter', brandName);
                }
            }
        }
    });
}

// Create category performance chart
function createCategoryPerformanceChart() {
    const aggregatedData = aggregateDataByField('Category');
    
    const ctx = document.getElementById('categoryPerformanceChart');
    if (!ctx) return;
    
    charts.categoryPerformance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: aggregatedData.map(item => item.name),
            datasets: [{
                label: 'Total Value',
                data: aggregatedData.map(item => item.totalValue),
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ffd700',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            ...getChartOptions('Value'),
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const categoryName = aggregatedData[index].name;
                    selectFilterOption('categoryFilter', categoryName);
                }
            }
        }
    });
}

// Create molecule distribution chart
function createMoleculeDistributionChart() {
    const aggregatedData = aggregateDataByField('Molecule');
    
    const ctx = document.getElementById('moleculeDistributionChart');
    if (!ctx) return;
    
    charts.moleculeDistribution = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: aggregatedData.map(item => item.name),
            datasets: [{
                data: aggregatedData.map(item => item.totalUnits),
                backgroundColor: generateGradientColors(aggregatedData.length, 5),
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 3
            }]
        },
        options: {
            ...getChartOptions(),
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const moleculeName = aggregatedData[index].name;
                    selectFilterOption('moleculeFilter', moleculeName);
                }
            }
        }
    });
}

// Create radar chart
function createRadarChart() {
    const brandData = aggregateDataByField('Brand').slice(0, 5);
    
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;
    
    charts.radar = new Chart(ctx.getContext('2d'), {
        type: 'radar',
        data: {
            labels: brandData.map(item => item.name),
            datasets: [{
                label: 'Value Performance',
                data: brandData.map(item => item.totalValue),
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                borderColor: 'rgba(33, 150, 243, 1)',
                borderWidth: 3,
                pointBackgroundColor: '#ffd700',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: 'Unit Performance',
                data: brandData.map(item => item.totalUnits),
                backgroundColor: 'rgba(255, 143, 0, 0.2)',
                borderColor: 'rgba(255, 143, 0, 1)',
                borderWidth: 3,
                pointBackgroundColor: '#f44336',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            ...getChartOptions(),
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    },
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    }
                }
            }
        }
    });
}

// Aggregate data by field
function aggregateDataByField(field) {
    const aggregated = {};
    
    filteredData.forEach(item => {
        const key = item[field];
        if (!aggregated[key]) {
            aggregated[key] = {
                name: key,
                totalValue: 0,
                totalUnits: 0,
                avgValueGrowth: 0,
                avgUnitGrowth: 0,
                count: 0
            };
        }
        
        aggregated[key].totalValue += item.Value25 || 0;
        aggregated[key].totalUnits += item.Unit25 || 0;
        aggregated[key].avgValueGrowth += item.GrowthValue25 || 0;
        aggregated[key].avgUnitGrowth += item.GrowthUnit25 || 0;
        aggregated[key].count += 1;
    });
    
    // Calculate averages
    Object.values(aggregated).forEach(item => {
        if (item.count > 0) {
            item.avgValueGrowth = item.avgValueGrowth / item.count;
            item.avgUnitGrowth = item.avgUnitGrowth / item.count;
        }
    });
    
    return Object.values(aggregated);
}

// Get chart options
function getChartOptions(yAxisLabel = '', onClick = null, xAxisLabel = '') {
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#ffffff',
                    font: {
                        size: 12,
                        weight: '600'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#ffd700',
                bodyColor: '#ffffff',
                borderColor: '#2196f3',
                borderWidth: 2,
                cornerRadius: 10,
                displayColors: true
            }
        },
        scales: yAxisLabel ? {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#ffffff',
                    font: {
                        weight: '600'
                    },
                    callback: function(value) {
                        if (yAxisLabel.includes('Value')) {
                            return formatLargeNumber(value, true);
                        } else if (yAxisLabel.includes('Units')) {
                            return formatLargeNumber(value);
                        } else if (yAxisLabel.includes('%')) {
                            return value.toFixed(1) + '%';
                        }
                        return formatNumber(value);
                    }
                },
                title: {
                    display: true,
                    text: yAxisLabel,
                    color: '#ffd700',
                    font: {
                        size: 14,
                        weight: '600'
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#ffffff',
                    font: {
                        weight: '600'
                    }
                },
                title: xAxisLabel ? {
                    display: true,
                    text: xAxisLabel,
                    color: '#ffd700',
                    font: {
                        size: 14,
                        weight: '600'
                    }
                } : undefined,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        } : undefined,
        onClick: onClick,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    };
}

// Generate gradient colors
function generateGradientColors(count, variant = 0) {
    const colorSets = [
        ['rgba(33, 150, 243, 0.8)', 'rgba(123, 31, 162, 0.8)', 'rgba(255, 143, 0, 0.8)', 'rgba(244, 67, 54, 0.8)', 'rgba(76, 175, 80, 0.8)'],
        ['rgba(255, 215, 0, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(255, 152, 0, 0.8)', 'rgba(255, 87, 34, 0.8)', 'rgba(244, 67, 54, 0.8)'],
        ['rgba(156, 39, 176, 0.8)', 'rgba(103, 58, 183, 0.8)', 'rgba(63, 81, 181, 0.8)', 'rgba(33, 150, 243, 0.8)', 'rgba(3, 169, 244, 0.8)'],
        ['rgba(0, 188, 212, 0.8)', 'rgba(0, 150, 136, 0.8)', 'rgba(76, 175, 80, 0.8)', 'rgba(139, 195, 74, 0.8)', 'rgba(205, 220, 57, 0.8)'],
        ['rgba(255, 87, 34, 0.8)', 'rgba(255, 152, 0, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(255, 235, 59, 0.8)', 'rgba(205, 220, 57, 0.8)'],
        ['rgba(121, 85, 72, 0.8)', 'rgba(158, 158, 158, 0.8)', 'rgba(96, 125, 139, 0.8)', 'rgba(69, 90, 100, 0.8)', 'rgba(55, 71, 79, 0.8)']
    ];
    
    const colors = colorSets[variant % colorSets.length];
    const result = [];
    
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    
    return result;
}

// Update data table
function updateDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.SKU || ''}</td>
            <td>${item.Brand || ''}</td>
            <td>${item.Category || ''}</td>
            <td>${item.Molecule || ''}</td>
            <td>${formatLargeNumber(item.Value25 || 0, true)}</td>
            <td>${formatLargeNumber(item.Unit25 || 0)}</td>
            <td style="color: ${(item.GrowthValue25 || 0) >= 0 ? '#4caf50' : '#f44336'}">${formatPercentage(item.GrowthValue25 || 0)}</td>
            <td style="color: ${(item.GrowthUnit25 || 0) >= 0 ? '#4caf50' : '#f44336'}">${formatPercentage(item.GrowthUnit25 || 0)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Utility functions
function formatLargeNumber(value, isCurrency = false) {
    const absValue = Math.abs(value);
    let formattedValue;
    let suffix = '';
    
    if (absValue >= 1e9) {
        formattedValue = (value / 1e9).toFixed(1);
        suffix = 'B';
    } else if (absValue >= 1e6) {
        formattedValue = (value / 1e6).toFixed(1);
        suffix = 'M';
    } else if (absValue >= 1e3) {
        formattedValue = (value / 1e3).toFixed(1);
        suffix = 'K';
    } else {
        formattedValue = value.toFixed(0);
    }
    
    if (isCurrency) {
        return `$${formattedValue}${suffix}`;
    }
    return `${formattedValue}${suffix}`;
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
}