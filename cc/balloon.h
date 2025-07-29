struct Point
{
	// DATA

public:
	// Position in space
	double x, y, z;

	// Normal
	double nx, ny, nz;
	
	// Color
	double R, G, B, A;
};

struct Triangle
{
	Point A, B, C;
};

class Balloon
{
public:
	// Position in space
	double x, y, z;

	// Color ( + Alpha)
	double R, G, B, A;

	// properties of the balloon
	double radius;
	double pressure;

	// triangles
	Triangle *mesh;
	int count;

	Point *point_list;
	int count_point_list;


	bool setup_complete;
public:
	// constructor

	// default balloon
	Balloon();

	// destructor
	~Balloon();

	// setup triangles
	setup(int segments, int pies, bool color);

	// press against other balloon
	deform( Balloon& );
};