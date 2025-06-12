class LoanCalculator {
  constructor() {
    this.loans = [];
    this.loanCount = 0;
    this.maxLoans = 4;
    this.savedData = null;
    this.initializeElements();
    this.addInitialLoan();
    this.setupEventListeners();
  }

  initializeElements() {
    this.loanContainer = document.getElementById('loanContainer');
    this.addLoanBtn = document.getElementById('addLoanBtn');
    this.prepaymentSlider = document.getElementById('prepaymentSlider');
    this.prepaymentValue = document.getElementById('prepaymentValue');
    this.resultsSection = document.getElementById('resultsSection');
    this.resultsGrid = document.getElementById('resultsGrid');
    this.amortizationSection = document.getElementById('amortizationSection');
    this.amortizationBody = document.getElementById('amortizationBody');
    this.summaryContent = document.getElementById('summaryContent');
    this.saveBtn = document.getElementById('saveBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
  }

  setupEventListeners() {
    this.addLoanBtn.addEventListener('click', () => this.addLoan());
    this.prepaymentSlider.addEventListener('input', (e) => this.updatePrepayment(e));
    this.loanContainer.addEventListener('input', () => this.calculateAll());
    this.saveBtn.addEventListener('click', () => this.saveComparison());
    this.downloadBtn.addEventListener('click', () => this.downloadCSV());
  }
  

  createEnhancedPieChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [data.principal, data.totalInterest],
          backgroundColor: ['#ff6b6b', '#4ecdc4'],
          borderWidth: 0,
          cutout: '75%',
          circumference: 300,
          rotation: -150
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataIndex === 0 ? 'Principal' : 'Interest';
                const value = context.parsed;
                const percent = ((value / (data.principal + data.totalInterest)) * 100).toFixed(1);
                return `${label}: ₹${value.toLocaleString('en-IN')} (${percent}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 1500
        }
      }
    });
  }

  addLoan() {
    if (this.loanCount >= this.maxLoans) return;

    this.loanCount++;
    
    // Set default start date to current month
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
    
    const loanDiv = document.createElement('div');
    loanDiv.className = 'loan-section fade-in';
    loanDiv.innerHTML = `
      <div class="loan-header">
        <h3 class="loan-title">
          <i class="fas fa-home"></i>
          Loan ${this.loanCount}
        </h3>
        ${this.loanCount > 1 ? `<button class="remove-btn" onclick="loanCalculator.removeLoan(this)"><i class="fas fa-trash"></i> Remove</button>` : ''}
      </div>
      <div class="input-group">
        <div class="form-field">
          <label>Loan Amount (₹)</label>
          <input type="number" class="loan-principal" placeholder="500000" value="500000" min="1000" step="1000">
        </div>
        <div class="form-field">
          <label>Tenure (months)</label>
          <input type="number" class="loan-tenure" placeholder="30" value="30" min="1" max="360">
        </div>
        <div class="form-field">
          <label>Interest Rate (% per annum)</label>
          <input type="number" class="loan-rate" placeholder="8.5" value="8.5" min="0.1" max="50" step="0.01">
        </div>
        <div class="form-field">
          <label>Start Date</label>
          <input type="month" class="loan-start-date" value="${currentMonth}" />
        </div>
        <div class="form-field">
          <label>View Mode</label>
          <select class="loan-view-mode">
            <option value="month">Month-wise</option>
            <option value="calendar">Calendar Year</option>
          </select>
        </div>
      </div>
    `;
    this.loanContainer.appendChild(loanDiv);
    this.updateAddButton();
  }

  addInitialLoan() {
    this.addLoan();
    this.calculateAll();
  }

  removeLoan(button) {
    const loanSection = button.closest('.loan-section');
    loanSection.style.transform = 'translateX(-100%)';
    loanSection.style.opacity = '0';

    setTimeout(() => {
      loanSection.remove();
      this.loanCount--;
      this.renumberLoans();
      this.updateAddButton();
      this.calculateAll();
    }, 300);
  }

  renumberLoans() {
    const loanSections = this.loanContainer.querySelectorAll('.loan-section');
    loanSections.forEach((section, index) => {
      const title = section.querySelector('.loan-title');
      title.innerHTML = `<i class="fas fa-home"></i> Loan ${index + 1}`;
    });
  }

  updateAddButton() {
    this.addLoanBtn.disabled = this.loanCount >= this.maxLoans;
    this.addLoanBtn.innerHTML = this.loanCount >= this.maxLoans
      ? '<i class="fas fa-info-circle"></i> Maximum loans reached'
      : '<i class="fas fa-plus"></i> Add Another Loan';
  }

  updatePrepayment(e) {
    this.prepaymentValue.textContent = e.target.value + '%';
    this.calculateAll();
  }

  calculateAll() {
    const principals = document.querySelectorAll('.loan-principal');
    const tenures = document.querySelectorAll('.loan-tenure');
    const rates = document.querySelectorAll('.loan-rate');
    const prepaymentPercent = parseFloat(this.prepaymentSlider.value) / 100;

    this.clearResults();

    let validLoans = 0;
    let totalEMI = 0;
    let totalInterest = 0;
    let totalAmount = 0;

    for (let i = 0; i < principals.length; i++) {
      const P = parseFloat(principals[i].value);
      const N = parseFloat(tenures[i].value);
      const R = parseFloat(rates[i].value);

      if (isNaN(P) || isNaN(N) || isNaN(R) || P <= 0 || N <= 0 || R <= 0) continue;

      validLoans++;
      const prepayment = P * prepaymentPercent;
      const effectiveP = P - prepayment;
      const monthlyRate = R / 1200;
      const EMI = (effectiveP * monthlyRate * Math.pow(1 + monthlyRate, N)) /
                  (Math.pow(1 + monthlyRate, N) - 1);
      const totalPayment = EMI * N;
      const totalInterestAmount = totalPayment - effectiveP;

      totalEMI += EMI;
      totalInterest += totalInterestAmount;
      totalAmount += totalPayment;

      this.displayLoanResult(i + 1, {
        emi: EMI,
        totalPayment,
        totalInterest: totalInterestAmount,
        principal: effectiveP,
        prepayment,
        originalPrincipal: P
      });

      this.generateAmortizationSchedule(i + 1, effectiveP, EMI, monthlyRate, N);
    }

    if (validLoans > 0) {
      this.displaySummary(totalEMI, totalInterest, totalAmount, validLoans);
      this.showResults();
    } else {
      this.hideSummary();
    }
  }

  displayLoanResult(loanNumber, data) {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card fade-in';
    resultCard.innerHTML = `
      <div class="result-header">
        <h3 class="result-title">Loan ${loanNumber}</h3>
        <div class="loan-badge">Details</div>
      </div>
      <div class="summary-grid">
        <div class="metric"><div class="metric-label">Monthly EMI</div><div class="metric-value">₹${this.formatNumber(data.emi)}</div></div>
        <div class="metric"><div class="metric-label">Total Interest</div><div class="metric-value">₹${this.formatNumber(data.totalInterest)}</div></div>
        <div class="metric"><div class="metric-label">Total Payment</div><div class="metric-value">₹${this.formatNumber(data.totalPayment)}</div></div>
        ${data.prepayment > 0 ? `<div class="metric"><div class="metric-label">Prepayment Made</div><div class="metric-value">₹${this.formatNumber(data.prepayment)}</div></div>` : ''}
      </div>
      <div class="chart-container">
        <div class="chart-header">
          <div class="chart-title">Payment Breakdown</div>
          <div class="chart-subtitle">Principal vs Interest</div>
        </div>
        
        <div class="donut-chart-container">
          <canvas id="pieChartLoan${loanNumber}"></canvas>
          <div class="chart-center-content">
            <div class="center-label">Monthly EMI</div>
            <div class="center-value">₹${this.formatNumber(data.emi)}</div>
            <div class="center-sublabel">per month</div>
          </div>
        </div>
        
        <div class="chart-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: #ff6b6b;"></div>
            <div class="legend-text">Principal: ₹${this.formatNumber(data.principal)}</div>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #4ecdc4;"></div>
            <div class="legend-text">Interest: ₹${this.formatNumber(data.totalInterest)}</div>
          </div>
        </div>
      </div>
    `;

    this.resultsGrid.appendChild(resultCard);

    setTimeout(() => {
      this.createEnhancedPieChart(`pieChartLoan${loanNumber}`, data);
    }, 100);
  }

  displaySummary(totalEMI, totalInterest, totalAmount, loanCount) {
    this.summaryContent.innerHTML = `
      <div class="summary-grid">
        <div class="metric"><div class="metric-label">Total Monthly EMI</div><div class="metric-value">₹${this.formatNumber(totalEMI)}</div></div>
        <div class="metric"><div class="metric-label">Total Interest</div><div class="metric-value">₹${this.formatNumber(totalInterest)}</div></div>
        <div class="metric"><div class="metric-label">Total Amount</div><div class="metric-value">₹${this.formatNumber(totalAmount)}</div></div>
        <div class="metric"><div class="metric-label">Active Loans</div><div class="metric-value">${loanCount}</div></div>
      </div>
    `;

    this.drawEmiTimelineChart();
  }

  hideSummary() {
    this.summaryContent.innerHTML = `<div style="text-align: center; padding: 40px; color: #9ca3af;"><i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 15px;"></i><p>Enter loan details to see your comparison</p></div>`;
  }

  

 // ✅ Enhanced: hover based on color & balance line rendered on top

drawEmiTimelineChart() {
  const container = document.getElementById('emiTimelineChart');
  if (!container) return;

  if (this.emiTimelineChart) {
    this.emiTimelineChart.destroy();
  }

  const ctx = container.getContext('2d');
  const principals = document.querySelectorAll('.loan-principal');
  const tenures = document.querySelectorAll('.loan-tenure');
  const rates = document.querySelectorAll('.loan-rate');
  const startDates = document.querySelectorAll('.loan-start-date');
  const viewModes = document.querySelectorAll('.loan-view-mode');

  const prepaymentPercent = parseFloat(this.prepaymentSlider.value) / 100;
  const chartColors = [
    ['#7dd3fc', '#fca5a5', '#ef4444'],
    ['#a5f3fc', '#fde68a', '#f43f5e'],
    ['#c4b5fd', '#fcd34d', '#e11d48'],
    ['#f0abfc', '#fdba74', '#be123c']
  ];

  const labels = [];
  const allDatasets = [];

  for (let i = 0; i < principals.length; i++) {
    const P = parseFloat(principals[i].value);
    const N = parseInt(tenures[i].value);
    const R = parseFloat(rates[i].value);
    const startDate = startDates[i].value;
    const viewMode = viewModes[i]?.value || 'month';

    if (!P || !N || !R || !startDate) continue;

    const effectiveP = P - (P * prepaymentPercent);
    const r = R / 1200;
    const emi = (effectiveP * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);

    let balance = effectiveP;
    const principalParts = [], interestParts = [], balances = [], dateLabels = [];

    const [startYear, startMonth] = startDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1);

    const yearBuckets = {};

    for (let m = 0; m < N; m++) {
      const interest = balance * r;
      const principalPart = emi - interest;
      balance = Math.max(0, balance - principalPart);

      const labelDate = new Date(start.getFullYear(), start.getMonth() + m);
      const monthLabel = labelDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const year = labelDate.getFullYear();

      if (viewMode === 'calendar') {
        if (!yearBuckets[year]) {
          yearBuckets[year] = { principal: 0, interest: 0, balances: [] };
        }
        yearBuckets[year].principal += principalPart;
        yearBuckets[year].interest += interest;
        yearBuckets[year].balances.push(balance);
      } else {
        dateLabels.push(monthLabel);
        principalParts.push(+principalPart.toFixed(2));
        interestParts.push(+interest.toFixed(2));
        balances.push(+balance.toFixed(2));
      }
    }

    if (viewMode === 'calendar') {
      const years = Object.keys(yearBuckets).sort();
      years.forEach(year => {
        const y = yearBuckets[year];
        const avgBalance = y.balances.reduce((a, b) => a + b, 0) / y.balances.length;
        dateLabels.push(year);
        principalParts.push(+y.principal.toFixed(2));
        interestParts.push(+y.interest.toFixed(2));
        balances.push(+avgBalance.toFixed(2));
      });
    }

    if (labels.length < dateLabels.length) {
      labels.length = 0;
      labels.push(...dateLabels);
    }

    const [principalColor, interestColor, balanceColor] = chartColors[i % chartColors.length];

    allDatasets.unshift({
      type: 'line',
      label: `Loan ${i + 1} - Balance`,
      data: balances,
      borderColor: balanceColor,
      backgroundColor: balanceColor,
      pointRadius: 5,
      pointHoverRadius: 8,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
      pointBackgroundColor: balanceColor,
      fill: false,
      borderWidth: 3,
      yAxisID: 'y',
      tension: 0.4,
      order: 0
    });

    allDatasets.push(
      {
        type: 'bar',
        label: `Loan ${i + 1} - Principal`,
        data: principalParts,
        backgroundColor: principalColor,
        stack: `loan${i}`,
        yAxisID: 'y1',
        hoverBackgroundColor: principalColor
      },
      {
        type: 'bar',
        label: `Loan ${i + 1} - Interest`,
        data: interestParts,
        backgroundColor: interestColor,
        stack: `loan${i}`,
        yAxisID: 'y1',
        hoverBackgroundColor: interestColor
      }
    );
  }

  this.emiTimelineChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: allDatasets
    },
    options: {
      hover: {
        mode: 'dataset',
        onHover: (e, activeElements) => {
          const chart = e.chart;
          chart.data.datasets.forEach((ds, idx) => {
            const isActive = activeElements.some(a => a.datasetIndex === idx);
            chart.setDatasetVisibility(idx, true);
            chart.getDatasetMeta(idx).hidden = false;
            chart.getDatasetMeta(idx).elements.forEach(el => {
              if (el) {
                el.options.backgroundColor = isActive ? ds.backgroundColor : Chart.helpers.color(ds.backgroundColor).alpha(0.2).rgbString();
                el.options.borderColor = isActive ? ds.borderColor || ds.backgroundColor : Chart.helpers.color(ds.borderColor || ds.backgroundColor).alpha(0.2).rgbString();
              }
            });
          });
          chart.draw();
        }
      },
      responsive: true,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: 'EMI Timeline - Principal vs Interest vs Balance',
          font: { size: 16 }
        },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ₹${Math.round(context.raw).toLocaleString('en-IN')}`;
            },
            title: function (items) {
              return `${items[0].label}`;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 16,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: viewModes[0]?.value === 'calendar' ? 'Year' : 'Month-Year'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 30
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Remaining Balance (₹)' },
          ticks: {
            callback: val => '₹' + val.toLocaleString('en-IN')
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'EMI Payment (₹)' },
          grid: { drawOnChartArea: false },
          stacked: true,
          ticks: {
            callback: val => '₹' + val.toLocaleString('en-IN')
          }
        }
      }
    }
  });
}







  generateAmortizationSchedule(loanNumber, principal, emi, monthlyRate, tenure) {
    let balance = principal;
    let cumulativeInterest = 0;

    const startDateInput = document.querySelectorAll('.loan-start-date')[loanNumber - 1];
    const viewModeInput = document.querySelectorAll('.loan-view-mode')[loanNumber - 1];
    const startDateValue = startDateInput?.value;
    const viewMode = viewModeInput?.value || 'month';

    // Parse the start date properly
    let startDate = new Date();
    if (startDateValue) {
      const [year, month] = startDateValue.split('-');
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    }

    // Create individual schedule container
    const scheduleContainer = document.createElement('div');
    scheduleContainer.className = 'individual-loan-schedule';
    scheduleContainer.innerHTML = `
      <h3 style="margin: 20px 0 10px; font-weight: 600; color: #1e293b;">
        Loan ${loanNumber} Amortization Schedule
      </h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>EMI</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Balance</th>
              <th>Total Paid</th>
              <th>Cumulative Interest</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    // Add to the main amortization section
    this.amortizationSection.querySelector('.card-title').insertAdjacentElement('afterend', scheduleContainer);

    const tbody = scheduleContainer.querySelector('tbody');

    for (let month = 1; month <= tenure; month++) {
      if (balance <= 0) break;
      
      const interestAmount = balance * monthlyRate;
      const principalAmount = emi - interestAmount;
      balance = Math.max(0, balance - principalAmount);
      cumulativeInterest += interestAmount;

      const status = balance <= 0 || month === tenure ? 'Completed' : 'Active';
      const statusClass = balance <= 0 || month === tenure ? 'status-completed' : 'status-active';

      let displayDate = '';
      if (viewMode === 'calendar') {
        const currentDate = new Date(startDate);
        currentDate.setMonth(currentDate.getMonth() + (month - 1));
        displayDate = currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
      } else {
        displayDate = `M${month}`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${displayDate}</td>
        <td>₹${this.formatNumber(emi)}</td>
        <td>₹${this.formatNumber(principalAmount)}</td>
        <td>₹${this.formatNumber(interestAmount)}</td>
        <td>₹${this.formatNumber(balance)}</td>
        <td>₹${this.formatNumber(emi * month)}</td>
        <td>₹${this.formatNumber(cumulativeInterest)}</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
      `;
      tbody.appendChild(row);
    }
  }

  showResults() {
    this.resultsSection.classList.remove('hidden');
    this.amortizationSection.classList.remove('hidden');
  }

  clearResults() {
    this.resultsGrid.innerHTML = '';
    
    // Clear all individual loan schedules
    const existingSchedules = this.amortizationSection.querySelectorAll('.individual-loan-schedule');
    existingSchedules.forEach(schedule => schedule.remove());
  }

  formatNumber(num) {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num));
  }

  saveComparison() {
    const data = {
      prepayment: this.prepaymentSlider.value,
      loans: Array.from(document.querySelectorAll('.loan-principal')).map((_, i) => ({
        principal: document.querySelectorAll('.loan-principal')[i].value,
        tenure: document.querySelectorAll('.loan-tenure')[i].value,
        rate: document.querySelectorAll('.loan-rate')[i].value,
        startDate: document.querySelectorAll('.loan-start-date')[i].value,
        viewMode: document.querySelectorAll('.loan-view-mode')[i].value
      }))
    };

    this.savedData = data;
    const originalText = this.saveBtn.innerHTML;
    this.saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    this.saveBtn.style.background = '#10b981';
    setTimeout(() => {
      this.saveBtn.innerHTML = originalText;
      this.saveBtn.style.background = '';
    }, 2000);
  }

  downloadCSV() {
    const schedules = this.amortizationSection.querySelectorAll('.individual-loan-schedule');
    if (schedules.length === 0) {
      alert('No data to download. Please calculate loans first.');
      return;
    }

    let csv = 'Loan,Month,EMI,Principal,Interest,Balance,Total Payment,Cumulative Interest,Status\n';
    
    schedules.forEach((schedule, loanIndex) => {
      const rows = schedule.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = [`Loan ${loanIndex + 1}`];
        Array.from(cells).forEach(cell => {
          rowData.push(cell.textContent.replace(/₹|,/g, ''));
        });
        csv += rowData.join(',') + '\n';
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_amortization_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  window.loanCalculator = new LoanCalculator();
});

