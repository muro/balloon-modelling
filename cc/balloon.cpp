
#include "balloon.h"
#include <math.h>
#include <memory.h>

#define PI 3.1415


// ***********************************************************
//							Balloon
// ***********************************************************
Balloon::Balloon()
{
	x = 0.0;
	y = 0.0;
	z = 0.0;
	
	R = 1.0;
	G = 1.0;
	B = 1.0;
	A = 1.0;
	
	radius = 1.0;
	pressure = 1.0;
	
	setup_complete = false;
}


Balloon::~Balloon()
{
	// delete triangles
	if (setup_complete)
	{
		delete[] mesh;
		delete[] point_list;
	}
}

Balloon::setup(int segments, int pies, bool color)
{
	count = 2*segments*pies;
	mesh = new Triangle[count];
	
	Point A;
	Point B;
	Point C;
	Point D;
	
	// now build the triangles of each sphere
	// undeformed now.
	double ytemp; double rtemp;
	int k = 0;
	int i; int j;
	
	for (i = 1; i <= segments; i++)
	{
		for (j = 0; j < pies; j++)
		{
			ytemp = radius*cos(PI*i/segments);
			rtemp = sqrt((radius*radius)-(ytemp*ytemp));
			
			A.x = x + (rtemp*sin(2*PI*j/pies));
			A.y =  y + ytemp;
			A.z = z + (rtemp*cos(2*PI*j/pies));
			
			A.nx = A.x / radius;
			A.ny = A.y / radius;
			A.nz = A.z / radius;
			
			A.R = 1.0;
			A.G = 1.0;
			A.B = 1.0;
			A.A = 1.0;
			
			if (color && (j%2 == i%2))
			{
				A.R = .2;
				A.G = .2;
			}
			
			ytemp = radius*cos(PI*(i-1)/segments);
			rtemp = sqrt((radius*radius)-(ytemp*ytemp));
			
			B.x = x + (rtemp*sin(2*PI*j/pies));
			B.y = y + ytemp;
			B.z = z + (rtemp*cos(2*PI*j/pies));
			
			B.nx = B.x / radius;
			B.ny = B.y / radius;
			B.nz = B.z / radius;
			
			B.R = 1.0;
			B.G = 1.0;
			B.B = 1.0;
			B.A = 1.0;
			
			if (color && (j%2 == i%2))
			{
				B.R = .2;
				B.G = .2;
			}
			
			ytemp = radius*cos(PI*i/segments);
			rtemp = sqrt((radius*radius)-(ytemp*ytemp));
			
			C.x = x + (rtemp*sin(2*PI*(j+1)/pies));
			C.y = y + ytemp;
			C.z = z + (rtemp*cos(2*PI*(j+1)/pies));
			
			C.nx = C.x / radius;
			C.ny = C.y / radius;
			C.nz = C.z / radius;
			
			C.R = 1.0;
			C.G = 1.0;
			C.B = 1.0;
			C.A = 1.0;
			
			if (color && (j%2 == i%2))
			{
				C.R = .2;
				C.G = .2;
			}
			
			ytemp = radius*cos(PI*(i-1)/segments);
			rtemp = sqrt((radius*radius)-(ytemp*ytemp));
			
			D.x = x + (rtemp*sin(2*PI*(j+1)/pies));
			D.y = y + ytemp;
			D.z = z + (rtemp*cos(2*PI*(j+1)/pies));
			
			D.nx = D.x / radius;
			D.ny = D.y / radius;
			D.nz = D.z / radius;
			
			D.R = 1.0;
			D.G = 1.0;
			D.B = 1.0;
			D.A = 1.0;
			
			if (color && (j%2 == i%2))
			{
				D.R = .2;
				D.G = .2;
			}
			
			mesh[k].A = A; mesh[k].B = C; mesh[k++].C = B;
			mesh[k].A = C; mesh[k].B = D; mesh[k++].C = B;
		}
	}
	
	
	// create point list
	count_point_list = 3*count;
	point_list = new Point[count_point_list];
	
	int cur = 0;
	for (i = 0; i < count; i++)
	{
		point_list[cur++] = mesh[i].A;
		point_list[cur++] = mesh[i].B;
		point_list[cur++] = mesh[i].C;
	}
	
	setup_complete = true;
}

Balloon::deform(Balloon& Other)
{
	// check if pressure correct (if == 0 -> do nothing)
	if (pressure + Other.pressure == 0) return 0;
	
	// this is the vecotr between the centers of the balloons
	double Vx = x - Other.x;
	double Vy = y - Other.y;
	double Vz = z - Other.z;
	
	// check the distance (if greter than the sum of radii -> ok, else deform)
//	double dist = sqrt((Vx*Vx) + (Vy*Vy) + (Vz*Vz));
	
//	if (dist > (radius + Other.radius)) return 0; // distance big enough
	
	delete[] point_list;
	
	// change all vertices "behind" the deformation plane
	int c_this = 0;
	double c_x = 0; double c_y = 0; double c_z = 0;
	double d = 0;
	
	double Ix, Iy, Iz;
	
	for (int i = 0; i < count; i++)
	{
		// if vertex inside 2nd balloon -> add to c_xyz
		Point A, B, C;
		Point P;
		
		// choosing vertex
		
		A = mesh[i].A;
		B = mesh[i].B;
		C = mesh[i].C;
		
		for (int ver = 0; ver < 3; ver++)
		{
			switch(ver)
			{
			case 0:
				P = A;
				break;
			case 1:
				P = B;
				break;
			case 2:
			default:
				P = C;
				break;
			}
			
			d = sqrt((P.x - Other.x)*(P.x - Other.x) + 
				(P.y - Other.y)*(P.y - Other.y) + 
				(P.z - Other.z)*(P.z - Other.z));
			
			if (d < Other.radius)
			{
				double a = Vx*Vx + Vy*Vy + Vz*Vz;
				
				double b = Vx*(P.x-Other.x) + Vy*(P.y-Other.y) + Vz*(P.z-Other.z);
				
				double c = (P.x-Other.x)*(P.x-Other.x) + 
					(P.y-Other.y)*(P.y-Other.y) + 
					(P.z-Other.z)*(P.z-Other.z) - 
					Other.radius*Other.radius;
				double D = b*b-a*c;
				
				if (D < 0) ; // error
				else
				{
					double t2 = (-sqrt(D) - b)/a;
					double t1 = (sqrt(D) - b)/a;
					double t;
					
					if (t2 > 0)
						t = t2;
					else if (t1 > 0)
						t = t1;
					else
						t = 0;
					
					Ix = P.x + t*Vx;
					Iy = P.y + t*Vy;
					Iz = P.z + t*Vz;
				}
				// move point in direction S1->S2 distance  r2/(r1+r2)*width of intersection
				
				double Dx = P.x + (Ix-P.x) * (Other.pressure/(pressure+Other.pressure));
				double Dy = P.y + (Iy-P.y) * (Other.pressure/(pressure+Other.pressure));
				double Dz = P.z + (Iz-P.z) * (Other.pressure/(pressure+Other.pressure));
				
				P.x = Dx;
				P.y = Dy;
				P.z = Dz;
				
				switch (ver)
				{
				case 0:
					A = P;
					break;
				case 1:
					B = P;
					break;
				case 2:
				default:
					C = P;
					break;
				} // of switch
				
			} // of if dist 
			
		} // of for vertices
		
		
		// set normal vectors
		double ux = B.x - A.x;
		double uy = B.y - A.y;
		double uz = B.z - A.z;
		
		double vx = C.x - A.x;
		double vy = C.y - A.y;
		double vz = C.z - A.z;
		
		double nx = uy*vz - uz*vy;
		double ny = uz*vx - ux*vz;
		double nz = ux*vy - uy*vx;
		double dn = sqrt(nx*nx + ny*ny + nz*nz);
		
		A.nx = nx/dn; A.ny = ny/dn; A.nz = nz/dn;
		B.nx = nx/dn; B.ny = ny/dn; B.nz = nz/dn;
		C.nx = nx/dn; C.ny = ny/dn; C.nz = nz/dn;
		
		mesh[i].A = A;
		mesh[i].B = B;
		mesh[i].C = C;

	} // of for all triangles

	point_list = new Point[count_point_list];

	int cur = 0;

	for (int j = 0; j < count; j++)
	{
		point_list[cur++] = mesh[j].A;
		point_list[cur++] = mesh[j].B;
		point_list[cur++] = mesh[j].C;
	}
		
	return 0;
}