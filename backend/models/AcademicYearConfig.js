const mongoose = require("mongoose");

const academicYearConfigSchema = new mongoose.Schema(
  {
    // Current academic year configuration
    currentAcademicYear: {
      type: String,
      required: true,
      default: "2025-2026",
    },

    // Academic year start month (0-11, where 0 = January, 3 = April)
    academicYearStartMonth: {
      type: Number,
      required: true,
      default: 3, // April
      min: 0,
      max: 11,
    },

    // Graduation year to academic year mappings
    yearMappings: [
      {
        graduationYear: {
          type: Number,
          required: true,
        },
        academicYear: {
          type: String,
          required: true,
          enum: [
            "First Year",
            "Second Year",
            "Third Year",
            "Fourth Year",
            "Graduated",
          ],
        },
        displayName: {
          type: String,
          required: true,
        },
      },
    ],

    // Last updated information
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one configuration document exists
academicYearConfigSchema.index({ currentAcademicYear: 1 }, { unique: true });

// Static method to get or create the configuration
academicYearConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();

  if (!config) {
    // Create default configuration for current academic year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Determine current academic year based on April start
    let academicYearStart;
    if (currentMonth >= 3) {
      academicYearStart = currentYear;
    } else {
      academicYearStart = currentYear - 1;
    }

    // Create default mappings
    const defaultMappings = [
      {
        graduationYear: academicYearStart + 4,
        academicYear: "First Year",
        displayName: "I Year",
      },
      {
        graduationYear: academicYearStart + 3,
        academicYear: "Second Year",
        displayName: "II Year",
      },
      {
        graduationYear: academicYearStart + 2,
        academicYear: "Third Year",
        displayName: "III Year",
      },
      {
        graduationYear: academicYearStart + 1,
        academicYear: "Fourth Year",
        displayName: "IV Year",
      },
      {
        graduationYear: academicYearStart,
        academicYear: "Graduated",
        displayName: "Graduated",
      },
    ];

    // Add more graduated years
    for (let i = 1; i <= 5; i++) {
      defaultMappings.push({
        graduationYear: academicYearStart - i,
        academicYear: "Graduated",
        displayName: "Graduated",
      });
    }

    config = await this.create({
      currentAcademicYear: `${academicYearStart}-${academicYearStart + 1}`,
      academicYearStartMonth: 3,
      yearMappings: defaultMappings,
    });
  }

  return config;
};

// Method to get academic year for a graduation year
academicYearConfigSchema.methods.getAcademicYear = function (graduationYear) {
  const mapping = this.yearMappings.find(
    (m) => m.graduationYear === graduationYear
  );
  return mapping ? mapping.academicYear : "Graduated";
};

// Method to get display name for a graduation year
academicYearConfigSchema.methods.getDisplayName = function (graduationYear) {
  const mapping = this.yearMappings.find(
    (m) => m.graduationYear === graduationYear
  );
  return mapping ? mapping.displayName : "Graduated";
};

module.exports = mongoose.model("AcademicYearConfig", academicYearConfigSchema);
