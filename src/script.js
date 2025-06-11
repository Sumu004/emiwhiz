       class LoanCalculator {
            constructor() {
                this.loans = [];
                this.loanCount = 0;
                this.maxLoans = 4;
                this.savedData = null; // Store data in memory instead of localStorage
                this.initializeElements();
                this.setupEventListeners();
                this.addInitialLoan();
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

            addLoan() {
                if (this.loanCount >= this.maxLoans) return;
                
                this.loanCount++;
                const loanDiv = document.createElement('div');
                loanDiv.className = 'loan-section fade-in';
                loanDiv.innerHTML = `
                    <div class="loan-header">
                        <h3 class="loan-title">
                            <i class="fas fa-home"></i>
                            Loan ${this.loanCount}
                        </h3>
                        ${this.loanCount > 1 ? `<button class="remove-btn" onclick="loanCalculator.removeLoan(this)">
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>` : ''}
                    </div>
                    <div class="input-group">
                        <div class="form-field">
                            <label title="Enter loan amount in rupees">Loan Amount (₹)</label>
                            <input type="number" class="loan-principal" placeholder="Enter loan amount" min="1000" step="1000">
                        </div>
                        <div class="form-field">
                            <label title="Enter loan duration in months">Tenure (months)</label>
                            <input type="number" class="loan-tenure" placeholder="Enter tenure" min="1" max="360">
                        </div>
                        <div class="form-field">
                            <label title="Annual interest rate">Interest Rate (% per annum)</label>
                            <input type="number" class="loan-rate" placeholder="Enter rate" min="0.1" max="50" step="0.01">
                        </div>
                    </div>
                `;
                
                this.loanContainer.appendChild(loanDiv);
                this.updateAddButton();
            }

            addInitialLoan() {
                this.addLoan();
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
                if (this.loanCount >= this.maxLoans) {
                    this.addLoanBtn.innerHTML = '<i class="fas fa-info-circle"></i> Maximum loans reached';
                } else {
                    this.addLoanBtn.innerHTML = '<i class="fas fa-plus"></i> Add Another Loan';
                }
            }

            updatePrepayment(e) {
                const value = e.target.value;
                this.prepaymentValue.textContent = value + '%';
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

                    if (isNaN(P) || isNaN(N) || isNaN(R) || P <= 0 || N <= 0 || R <= 0) {
                        continue;
                    }

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
                    <div class="metric">
                        <div class="metric-label">Monthly EMI</div>
                        <div class="metric-value">₹${this.formatNumber(data.emi)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Interest</div>
                        <div class="metric-value">₹${this.formatNumber(data.totalInterest)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Payment</div>
                        <div class="metric-value">₹${this.formatNumber(data.totalPayment)}</div>
                    </div>
                    ${data.prepayment > 0 ? `
                    <div class="metric">
                        <div class="metric-label">Prepayment Made</div>
                        <div class="metric-value">₹${this.formatNumber(data.prepayment)}</div>
                    </div>
                    ` : ''}
                `;
                
                this.resultsGrid.appendChild(resultCard);
            }

            displaySummary(totalEMI, totalInterest, totalAmount, loanCount) {
                this.summaryContent.innerHTML = `
                    <div class="metric">
                        <div class="metric-label">Total Monthly EMI</div>
                        <div class="metric-value">₹${this.formatNumber(totalEMI)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Interest</div>
                        <div class="metric-value">₹${this.formatNumber(totalInterest)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Amount</div>
                        <div class="metric-value">₹${this.formatNumber(totalAmount)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Active Loans</div>
                        <div class="metric-value">${loanCount}</div>
                    </div>
                `;
            }

            hideSummary() {
                this.summaryContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <p>Enter loan details to see your comparison</p>
                    </div>
                `;
            }

            generateAmortizationSchedule(loanNumber, principal, emi, monthlyRate, tenure) {
                let balance = principal;
                let cumulativeInterest = 0;

                for (let month = 1; month <= tenure; month++) {
                    if (balance <= 0) break;

                    const interestAmount = balance * monthlyRate;
                    const principalAmount = emi - interestAmount;
                    balance = Math.max(0, balance - principalAmount);
                    cumulativeInterest += interestAmount;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${loanNumber}</td>
                        <td>${month}</td>
                        <td>₹${this.formatNumber(emi)}</td>
                        <td>₹${this.formatNumber(principalAmount)}</td>
                        <td>₹${this.formatNumber(interestAmount)}</td>
                        <td>₹${this.formatNumber(balance)}</td>
                        <td>₹${this.formatNumber(emi * month)}</td>
                        <td>₹${this.formatNumber(cumulativeInterest)}</td>
                    `;
                    
                    this.amortizationBody.appendChild(row);
                }
            }

            showResults() {
                this.resultsSection.classList.remove('hidden');
                this.amortizationSection.classList.remove('hidden');
            }

            clearResults() {
                this.resultsGrid.innerHTML = '';
                this.amortizationBody.innerHTML = '';
            }

            formatNumber(num) {
                return new Intl.NumberFormat('en-IN', {
                    maximumFractionDigits: 0
                }).format(Math.round(num));
            }

            saveComparison() {
                const data = {
                    prepayment: this.prepaymentSlider.value,
                    loans: Array.from(document.querySelectorAll('.loan-principal')).map((_, i) => ({
                        principal: document.querySelectorAll('.loan-principal')[i].value,
                        tenure: document.querySelectorAll('.loan-tenure')[i].value,
                        rate: document.querySelectorAll('.loan-rate')[i].value
                    }))
                };
                
                // Store in memory instead of localStorage
                this.savedData = data;
                
                // Show success message
                const originalText = this.saveBtn.innerHTML;
                this.saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                this.saveBtn.style.background = '#10b981';
                
                setTimeout(() => {
                    this.saveBtn.innerHTML = originalText;
                    this.saveBtn.style.background = '';
                }, 2000);
            }

            downloadCSV() {
                const rows = this.amortizationBody.querySelectorAll('tr');
                if (rows.length === 0) {
                    alert('No data to download. Please calculate loans first.');
                    return;
                }

                let csv = 'Loan,Month,EMI,Principal,Interest,Balance,Total Payment,Cumulative Interest\n';
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    const rowData = Array.from(cells).map(cell => 
                        cell.textContent.replace(/₹|,/g, '')
                    );
                    csv += rowData.join(',') + '\n';
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

        // Initialize the calculator when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            window.loanCalculator = new LoanCalculator();
        });